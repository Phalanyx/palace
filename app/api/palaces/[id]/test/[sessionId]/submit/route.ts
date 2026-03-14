import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireApiUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

type GradingAnswer = {
  objectId: string
  questionText: string
  correctAnswer: string
  userAnswer: string
}

type GradedAnswer = GradingAnswer & {
  score: number
  feedback: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const auth = await requireApiUser()
    if (!auth.user) {
      return auth.response
    }

    const params = await context.params
    const { sessionId } = params
    const body = await request.json()
    const { answers, gradingInstructions } = body as {
      answers: GradingAnswer[]
      gradingInstructions: string
    }

    const gradedItems: GradedAnswer[] = await Promise.all(
      answers.map(async (a) => {
        const prompt = `
You are grading a student's written answer for a memory palace quiz.
Grading instructions: "${gradingInstructions}"

Question: ${a.questionText}
Reference answer: ${a.correctAnswer}
Student answer: ${a.userAnswer || '(no answer given)'}

Grade this answer on a scale of 0-5 where:
  5 = excellent, demonstrates full understanding
  4 = good, minor gaps
  3 = adequate, partial understanding
  2 = limited understanding
  1 = minimal relevant content
  0 = no answer or completely wrong

Respond ONLY as valid JSON, no markdown:
{
  "score": <integer 0-5>,
  "feedback": "<1-2 sentence specific feedback explaining the score>"
}
`
        let score = 0
        let feedback = 'Could not grade this answer.'
        try {
          const resp = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          })
          let raw = resp.text?.trim() || ''
          // Strip markdown code fences if present
          raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
          const parsed = JSON.parse(raw)
          score = Math.min(5, Math.max(0, parseInt(parsed.score) || 0))
          feedback = parsed.feedback || feedback
        } catch (e) {
          console.error('Grading error for question:', a.questionText, e)
        }
        return { ...a, score, feedback }
      })
    )

    // Compute score percentage (sum of scores / max possible)
    const totalScore = gradedItems.reduce((s, g) => s + (g.score ?? 0), 0)
    const maxScore = gradedItems.length * 5
    const scorePct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

    const existingSession = await prisma.testSession.findFirst({
      where: {
        id: sessionId,
        palace: {
          userId: auth.user.id,
        },
      },
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await prisma.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        correctAnswers: gradedItems.filter(g => (g.score ?? 0) >= 3).length,
        scorePct,
        completedAt: new Date(),
        questions: {
          gradingInstructions,
          items: gradedItems.map(g => ({
            objectId: g.objectId,
            questionText: g.questionText,
            correctAnswer: g.correctAnswer,
            userAnswer: g.userAnswer,
            score: g.score,
            aiFeedback: g.feedback,
          }))
        } as Prisma.InputJsonValue,
      }
    })

    return NextResponse.json({ gradedItems, scorePct, totalScore, maxScore })
  } catch (error) {
    console.error('Error grading test session:', error)
    const message = error instanceof Error ? error.message : 'Failed to grade'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
