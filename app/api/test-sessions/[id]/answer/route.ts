import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { askMoorcheh } from '@/lib/moorcheh'
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

type SessionQuestion = {
  objectId: string
  questionText: string
  correctAnswer: string
  userAnswer: string | null
  isCorrect?: boolean
  aiFeedback?: string | null
}

type SessionEvaluation = {
  isCorrect: boolean
  feedback: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser()
    if (!auth.user) {
      return auth.response
    }

    const params = await context.params
    const sessionId = params.id
    const { objectId, userAnswer } = await request.json()

    if (!objectId || !userAnswer) {
      return NextResponse.json({ error: 'Missing objectId or userAnswer' }, { status: 400 })
    }

    const session = await prisma.testSession.findUnique({
      where: { id: sessionId },
      include: { palace: true }
    })

    if (!session || session.palace.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const parsedQuestions: SessionQuestion[] = Array.isArray(session.questions) 
      ? session.questions 
      : JSON.parse(session.questions as string)
      
    const currentQIndex = parsedQuestions.findIndex((question) => question.objectId === objectId)
    
    if (currentQIndex === -1) {
      return NextResponse.json({ error: 'Question not found in session' }, { status: 404 })
    }
    
    const targetQ = parsedQuestions[currentQIndex]

    // 1. Use Moorcheh's /answer to get context using the user's answer
    const namespace = `${process.env.MOORCHEH_PREFIX || ''}Palace${session.palaceId}`
    let moorchehContext = ""
    try {
      // We pass the user's answer directly to /answer. It returns a grounded answer 
      // based on the context it retrieves from its namespace. We can use that result 
      // as the source of truth for the Gemini grader
      const moorchehResponse = await askMoorcheh(namespace, userAnswer)
      moorchehContext = moorchehResponse.answer || ""
    } catch (e) {
      console.warn("Moorcheh grading evaluation failed, falling back", e)
    }

    // 2. Ask Gemini to Grade utilizing Moorcheh context and targetAnswer
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    
    const prompt = `
      You are an expert tutor grading a student's answer.
      
      Question asked: "${targetQ.questionText}"
      Ideal Answer: "${targetQ.correctAnswer}"
      Student's Answer: "${userAnswer}"
      
      Relevant Material Found addressing their answer: 
      "${moorchehContext}"
      
      Evaluate the student's answer. Be encouraging but accurate.
      Return the evaluation in this exact JSON format:
      {
         "isCorrect": boolean,
         "feedback": "Your detailed feedback to the student"
      }
    `

    const response = await model.generateContent(prompt)
    let evaluation: SessionEvaluation
    try {
      let cleanResponse = response.response.text()
      if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.split('```json')[1].split('```')[0].trim()
      }
      evaluation = JSON.parse(cleanResponse)
    } catch {
      evaluation = {
        isCorrect: true, // Optimistic fallback
        feedback: "Good attempt! Make sure to review the core concepts."
      }
    }

    // 3. Update Session State
    parsedQuestions[currentQIndex] = {
      ...targetQ,
      userAnswer,
      isCorrect: evaluation.isCorrect,
      aiFeedback: evaluation.feedback
    }
    
    // Check if session is completed
    const allAnswered = parsedQuestions.every((question) => question.userAnswer !== null)
    let scorePct = session.scorePct
    let status = session.status
    let completedAt = session.completedAt
    let correctAnswers = session.correctAnswers
    
    if (evaluation.isCorrect) {
      correctAnswers += 1;
    }

    if (allAnswered) {
      status = 'completed'
      completedAt = new Date()
      scorePct = (correctAnswers / session.totalQuestions) * 100
    }

    await prisma.testSession.update({
      where: { id: sessionId },
      data: {
        questions: parsedQuestions,
        correctAnswers,
        scorePct,
        status,
        completedAt
      }
    })

    return NextResponse.json({ 
      isCorrect: evaluation.isCorrect, 
      feedback: evaluation.feedback,
      sessionComplete: allAnswered
    })

  } catch (error) {
    console.error('Error grading answer:', error)
    const message = error instanceof Error ? error.message : 'Failed to grade answer'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
