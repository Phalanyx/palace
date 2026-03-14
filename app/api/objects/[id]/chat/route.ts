import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { askMoorcheh } from '@/lib/moorcheh'

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
    const objectId = params.id
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Find the object to get its label and palaceId (via room)
    const targetObject = await prisma.object.findUnique({
      where: { id: objectId },
      include: { room: { include: { palace: true } } }
    })

    if (!targetObject || targetObject.room.palace.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 })
    }

    // Call Moorcheh's /answer endpoint, scoped to this palace namespace
    const namespace = `${process.env.MOORCHEH_PREFIX || ''}Palace${targetObject.room.palaceId}`
    const query = `Focusing on ${targetObject.label}: ${message}`
    
    const moorchehResponse = await askMoorcheh(namespace, query)

    return NextResponse.json({
      answer: moorchehResponse.answer || "I couldn't find an answer to that."
    })
  } catch (error) {
    console.error('Error in POST /api/objects/:id/chat:', error)
    const message = error instanceof Error ? error.message : 'Failed to get answer'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
