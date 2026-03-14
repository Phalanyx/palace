import { NextResponse } from 'next/server'
import { Type } from '@google/genai'
import { ai } from '@/lib/gemini'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const prompt = (formData.get('prompt') as string)?.trim()
    const uploadedFiles = formData.getAll('files') as File[]

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    // Always generate a title + refined learning goal from the prompt
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a learning architect. A user wants to build a memory palace about: "${prompt}"

Generate structured content to scaffold their palace.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'A concise, evocative palace name (max 6 words)',
            },
            refinedPrompt: {
              type: Type.STRING,
              description: 'A clear 1–2 sentence learning goal',
            },
            expandedContent: {
              type: Type.STRING,
              description: '3–5 paragraphs of detailed knowledge content on the topic (only used when no files are uploaded)',
            },
          },
          required: ['title', 'refinedPrompt', 'expandedContent'],
        },
      },
    })

    const generated = JSON.parse(result.text ?? '{}') as {
      title: string
      refinedPrompt: string
      expandedContent: string
    }

    // Build FormData for /api/palaces
    const palaceForm = new FormData()
    palaceForm.append('title', generated.title)
    palaceForm.append('prompt', generated.refinedPrompt)

    if (uploadedFiles.length > 0) {
      // Use the real uploaded files as source documents
      uploadedFiles.forEach(f => palaceForm.append('files', f))
    } else {
      // Fall back to Gemini-generated content as the source document
      palaceForm.append(
        'files',
        new Blob([generated.expandedContent], { type: 'text/plain' }),
        'generated-content.txt'
      )
    }

    const host = request.headers.get('host') ?? 'localhost:3000'
    const proto = host.includes('localhost') ? 'http' : 'https'
    const palacesRes = await fetch(`${proto}://${host}/api/palaces`, {
      method: 'POST',
      body: palaceForm,
    })

    if (!palacesRes.ok) {
      const err = await palacesRes.json()
      return NextResponse.json({ error: err.error ?? 'Failed to create palace' }, { status: 500 })
    }

    const data = await palacesRes.json()
    return NextResponse.json({
      palaceId: data.palaceId,
      title: generated.title,
      prompt: generated.refinedPrompt,
    })
  } catch (error) {
    console.error('Error in POST /api/palaces/generate:', error)
    return NextResponse.json({ error: 'Failed to generate palace' }, { status: 500 })
  }
}
