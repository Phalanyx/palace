import { NextResponse } from 'next/server'
import { Type } from '@google/genai'
import { ai } from '@/lib/gemini'

// Extract plain text from a File object (txt, md, pdf placeholder)
async function extractFileText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  // For plain text / markdown, just decode
  if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    return buffer.toString('utf-8').slice(0, 8000) // cap per-file to avoid huge prompts
  }
  // For PDFs and other binary types, ask Gemini to transcribe inline
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.pptx')) {
    const base64 = buffer.toString('base64')
    const mimeType = file.name.endsWith('.pptx')
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : 'application/pdf'
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: 'Extract all the text from this document. Output only raw text, no formatting.' },
            { inlineData: { data: base64, mimeType } }
          ]
        }]
      })
      return (res.text ?? '').slice(0, 8000)
    } catch {
      return '' // If extraction fails, skip this file
    }
  }
  return ''
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const prompt = (formData.get('prompt') as string)?.trim()
    const uploadedFiles = formData.getAll('files') as File[]

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    // If files are attached, extract their text first so the LLM can use real context
    let fileContext = ''
    if (uploadedFiles.length > 0) {
      const texts = await Promise.all(uploadedFiles.map(f => extractFileText(f)))
      const combined = texts.filter(Boolean).join('\n\n---\n\n').slice(0, 20000) // overall cap
      if (combined) {
        fileContext = `\n\nSOURCE DOCUMENTS (use these to inform the title and learning goal):\n${combined}`
      }
    }

    // Generate a title + refined learning goal, informed by actual file content when available
    const contextNote = fileContext
      ? 'The user has also uploaded source documents (excerpts below). Use the actual content to create a specific, accurate title and learning goal.'
      : 'No files were uploaded, so base everything on the user\'s prompt.'

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a learning architect. A user wants to build a memory palace.

User's prompt: "${prompt}"

${contextNote}${fileContext}

Generate structured content to scaffold their palace.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'A concise, evocative palace name based on the actual source material (max 6 words)',
            },
            refinedPrompt: {
              type: Type.STRING,
              description: 'A clear 1–2 sentence learning goal derived from the source content',
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
