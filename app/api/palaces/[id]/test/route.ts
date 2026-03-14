import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requirePalaceAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type PalaceTestQuestion = {
  objectId: string
  questionText: string
  correctAnswer: string
  userAnswer: null
  score: null
  aiFeedback: null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const palaceId = params.id
    const body = await request.json().catch(() => ({}))
    const gradingInstructions: string = body.gradingInstructions || 'Grade based on conceptual understanding and accuracy.'

    const auth = await requirePalaceAccess(palaceId)
    if (!auth.palace) {
      return auth.response
    }

    const palace = await prisma.palace.findFirst({
      where: {
        id: palaceId,
        userId: auth.user.id,
      },
      include: { rooms: { include: { objects: true } } }
    })

    const allObjects = palace?.rooms.flatMap((room) => room.objects) || []

    if (!palace || allObjects.length === 0) {
      return NextResponse.json({ error: 'Palace not found or has no objects' }, { status: 404 })
    }

    // Use the pre-generated sampleQuestion from each Object
    const questions: PalaceTestQuestion[] = allObjects
      .filter((object) => object.sampleQuestion)
      .map((object) => ({
        objectId: object.id,
        questionText: object.sampleQuestion!,
        correctAnswer: object.description,
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
        questions: { gradingInstructions, items: questions } as Prisma.InputJsonValue,
      }
    })

    return NextResponse.json({ sessionId: session.id, questions, gradingInstructions })
  } catch (error) {
    console.error('Error creating test session:', error)
    const message = error instanceof Error ? error.message : 'Failed to create test session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
