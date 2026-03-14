import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { askMoorcheh } from '@/lib/moorcheh'

export async function POST(request: Request, context: any) {
  try {
    const { params } = context
    const objectId = params.id
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Find the object to get its label and palaceId (via room)
    const targetObject = await prisma.object.findUnique({
      where: { id: objectId },
      include: { room: true }
    })

    if (!targetObject) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 })
    }

    // Call Moorcheh's /answer endpoint, scoped to this palace namespace
    const namespace = `${process.env.MOORCHEH_PREFIX || ''}Palace${targetObject.room.palaceId}`
    const query = `Focusing on ${targetObject.label}: ${message}`
    
    const moorchehResponse = await askMoorcheh(namespace, query)

    return NextResponse.json({
      answer: moorchehResponse.answer || "I couldn't find an answer to that."
    })
  } catch (error: any) {
    console.error('Error in POST /api/objects/:id/chat:', error)
    return NextResponse.json({ error: error.message || 'Failed to get answer' }, { status: 500 })
  }
}
