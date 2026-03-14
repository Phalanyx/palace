import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ai } from '@/lib/gemini'

export async function POST(request: Request, context: any) {
  try {
    const params = await context.params
    const palaceId = params.id
    const body = await request.json()
    const { query } = body as { query: string }

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
    }

    const palace = await prisma.palace.findUnique({
      where: { id: palaceId },
      include: {
        rooms: {
          include: { objects: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!palace) {
      return NextResponse.json({ error: 'Palace not found' }, { status: 404 })
    }

    // Build a structured summary of all rooms and objects for the LLM
    const roomsSummary = palace.rooms.map((room) => ({
      roomKey: room.roomKey,
      objects: room.objects.map((obj) => ({
        id: obj.id,
        label: obj.label,
        description: obj.description,
        sampleQuestion: obj.sampleQuestion,
      })),
    }))

    const prompt = `You are a search assistant for a memory palace learning app.

The user wants to find where a specific topic was discussed in their palace.

Here are all the rooms and objects in this palace:
${JSON.stringify(roomsSummary, null, 2)}

User query: "${query}"

Find the room and object that BEST matches this query. Consider the object labels, descriptions, and sample questions.

Respond in this exact JSON format (no markdown, no code fences):
{
  "roomKey": "the_room_key",
  "objectId": "the_object_id",
  "objectLabel": "the object label",
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation of why this is the best match"
}

If no object matches at all, respond with:
{
  "roomKey": null,
  "objectId": null,
  "objectLabel": null,
  "confidence": 0,
  "reason": "explanation of why nothing matched"
}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const text = response.text?.trim() || ''

    // Parse the JSON response from Gemini
    let result
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
      result = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: text },
        { status: 500 }
      )
    }

    // Find the room index for the client to navigate to
    const roomIndex = palace.rooms.findIndex((r) => r.roomKey === result.roomKey)
    const room = roomIndex >= 0 ? palace.rooms[roomIndex] : null
    const objectIndex = room
      ? room.objects.findIndex((o) => o.id === result.objectId)
      : -1

    return NextResponse.json({
      match: {
        roomKey: result.roomKey,
        roomIndex: roomIndex >= 0 ? roomIndex : null,
        objectId: result.objectId,
        objectLabel: result.objectLabel,
        objectIndex: objectIndex >= 0 ? objectIndex : null,
        confidence: result.confidence,
        reason: result.reason,
      },
    })
  } catch (error: any) {
    console.error('Error searching rooms:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search rooms' },
      { status: 500 }
    )
  }
}
