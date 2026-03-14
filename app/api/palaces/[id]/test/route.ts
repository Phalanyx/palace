import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, context: any) {
  try {
    const params = await context.params
    const palaceId = params.id
    const body = await request.json().catch(() => ({}))
    const gradingInstructions: string = body.gradingInstructions || 'Grade based on conceptual understanding and accuracy.'

    const palace = await prisma.palace.findUnique({
      where: { id: palaceId },
      include: { rooms: { include: { objects: true } } }
    })

    const allObjects = palace?.rooms.flatMap((r: any) => r.objects) || []

    if (!palace || allObjects.length === 0) {
      return NextResponse.json({ error: 'Palace not found or has no objects' }, { status: 404 })
    }

    // Use the pre-generated sampleQuestion from each Object
    const questions = allObjects
      .filter((obj: any) => obj.sampleQuestion)
      .map((obj: any) => ({
        objectId: obj.id,
        questionText: obj.sampleQuestion,
        correctAnswer: obj.description, // used as reference for grading
        userAnswer: null,
        score: null,
        aiFeedback: null,
      }))

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions available (objects have no sampleQuestion)' }, { status: 400 })
    }

    const session = await prisma.testSession.create({
      data: {
        palaceId: palace.id,
        totalQuestions: questions.length,
        questions: { gradingInstructions, items: questions } as any,
      }
    })

    return NextResponse.json({ sessionId: session.id, questions, gradingInstructions })
  } catch (error: any) {
    console.error('Error creating test session:', error)
    return NextResponse.json({ error: error.message || 'Failed to create test session' }, { status: 500 })
  }
}
