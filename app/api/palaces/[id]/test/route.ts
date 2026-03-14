import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchMoorcheh } from '@/lib/moorcheh'
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: Request, context: any) {
  try {
    const { params } = context
    const palaceId = params.id
    
    const palace = await prisma.palace.findUnique({
      where: { id: palaceId },
      include: { rooms: { include: { objects: true } } }
    })

    const allObjects = palace?.rooms.flatMap((r: any) => r.objects) || []

    if (!palace || allObjects.length === 0) {
      return NextResponse.json({ error: 'Palace not found or has no objects' }, { status: 404 })
    }

    const namespace = `${process.env.MOORCHEH_PREFIX || ''}Palace${palace.id}`
    const questions = []

    // 1. For each object, generate a question using Moorcheh for distinct chunk retrieval
    for (const object of allObjects) {
        
      // Use Moorcheh's search to find the most semantically distinct/surprising chunks
      let searchResults
      try {
        searchResults = await searchMoorcheh(namespace, object.label, 3, 0.7)
      } catch (e) {
        console.error("Moorcheh search failed, falling back to basic prompt", e)
        searchResults = { results: [] }
      }

      const chunksContext = searchResults.results
        ?.map((r: any) => r.text)
        .join("\n\n") || object.description;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

      const prompt = `
        Based on these source contexts:
        ---
        ${chunksContext}
        ---
        
        Generate a single challenging, open-ended question about the concept "${object.label}".
        The question should test deep understanding of the source material.
        Provide the question and the ideal model answer in this exact JSON format:
        {
           "questionText": "What is...",
           "correctAnswer": "The ideal answer is..."
        }
      `
      
      const response = await model.generateContent(prompt)
      let parsedQuestion
      try {
        // Strip out MD JSON blocks if Present
        let cleanResponse = response.response.text()
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.split('```json')[1].split('```')[0].trim()
        }
        parsedQuestion = JSON.parse(cleanResponse)
      } catch (e) {
        // Fallback
        parsedQuestion = {
          questionText: `What can you tell me about ${object.label}?`,
          correctAnswer: object.description
        }
      }

      questions.push({
        objectId: object.id,
        questionText: parsedQuestion.questionText,
        correctAnswer: parsedQuestion.correctAnswer,
        userAnswer: null,
        isCorrect: null,
        aiFeedback: null
      })
    }

    // 2. Create Session
    const session = await prisma.testSession.create({
      data: {
        palaceId: palace.id,
        totalQuestions: questions.length,
        questions: questions
      }
    })

    return NextResponse.json({ sessionId: session.id })
    
  } catch (error: any) {
    console.error('Error creating test session:', error)
    return NextResponse.json({ error: error.message || 'Failed to create test session' }, { status: 500 })
  }
}
