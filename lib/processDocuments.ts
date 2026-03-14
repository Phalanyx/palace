import { GoogleGenAI, Type } from "@google/genai"
import { prisma } from "./prisma"
import { uploadToMoorcheh, createNamespace } from "./moorcheh"
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" })

const palaceSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      room_key: {
        type: Type.STRING,
        enum: ["bedroom", "great_hall", "kitchen", "library"],
        description: "Which 3D room environment to place these objects in"
      },
      objects: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING, description: "Short name, max 4 words" },
            description: { type: Type.STRING, description: "2-3 sentence explanation" },
            model_key: { 
              type: Type.STRING, 
              enum: ["book", "scroll", "crystal", "orb", "flask", "key", "coin", "torch"],
              description: "Visual representation type"
            },
            color_hint: { type: Type.STRING, description: "e.g., 'deep blue', 'warm amber'" },
            order_index: { type: Type.INTEGER },
            sample_question: { type: Type.STRING, description: "A test question evaluating the student's semantic understanding of this object's concept." },
            metadata: {
              type: Type.OBJECT,
              properties: {
                importance: { type: Type.STRING, enum: ["high", "medium", "low"] },
                relationships: { type: Type.ARRAY, items: { type: Type.STRING } },
                source_hint: { type: Type.STRING }
              }
            }
          },
          required: ["label", "description", "model_key", "order_index", "sample_question"]
        }
      }
    },
    required: ["room_key", "objects"]
  }
}

export async function processDocuments(palaceId: string) {
  try {
    const palace = await prisma.palace.findUnique({
      where: { id: palaceId },
      include: { documents: true }
    })

    if (!palace) throw new Error("Palace not found")

    // 1. Extract actual text from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const combinedTextArray: string[] = []
    const documentChunks: { id: string; text: string; metadata?: any }[] = []

    for (const doc of palace.documents) {
      if (!doc.storageUrl) continue

      const { data, error } = await supabase.storage.from('palace-documents').download(doc.storageUrl)
      if (error || !data) {
        console.error(`Failed to download ${doc.fileName}:`, error)
        continue
      }
      
      const buffer = Buffer.from(await data.arrayBuffer())
      const tempFilePath = path.join(os.tmpdir(), `upload-${doc.id}-${doc.fileName}`)
      fs.writeFileSync(tempFilePath, buffer)

      console.log(`Uploading ${doc.fileName} to Gemini...`)
      const uploadResult = await ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: doc.fileType === 'pdf' ? 'application/pdf' : 
                   (doc.fileType === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'text/plain')
        }
      })
      console.log(`Uploaded to Gemini as ${uploadResult.name}`)

      const transcriptionPrompt = "Extract and transcribe all the visible text content from this document from start to finish. Output ONLY the raw text without any markdown or formatting additions."
      const transcriptionResult = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: transcriptionPrompt }, { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } }] }
        ]
      })

      const text = transcriptionResult.text || ""
      combinedTextArray.push(`--- Document: ${doc.fileName} ---\n${text}`)

      // Cleanup
      fs.unlinkSync(tempFilePath)
      await ai.files.delete({ name: uploadResult.name! })

      // Prepare chunks for Moorcheh (approx 2000 chars per chunk)
      const chunkSize = 2000
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunkText = text.substring(i, i + chunkSize)
        if (chunkText.trim()) {
           documentChunks.push({
             id: `${doc.id}-chunk-${i}`,
             text: chunkText.trim(),
             metadata: {
               documentId: doc.id,
               fileName: doc.fileName
             }
           })
        }
      }
    }

    const combinedText = `
      Contents from uploaded documents for: ${palace.title}
      We are focusing on: ${palace.prompt}
      
      ${combinedTextArray.join('\n\n')}
    `

    // 2. Call Gemini to generate rooms + objects
    const systemPrompt = `
      You are building a memory palace. Given document text and a user's learning goal,
      organize the most important concepts into ROOMS of a medieval palace.
      
      Available rooms: bedroom, great_hall, kitchen, library.
      You do NOT need to use all rooms. Choose 2-4 rooms that thematically fit the content.
      Each room should contain 2-6 objects. Aim for 8-15 objects total across all rooms.
      Group related concepts into the same room. Order objects within each room logically.
      
      User's learning goal: "${palace.prompt}"
    `

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }, { text: combinedText }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: palaceSchema
      }
    })

    const responseText = response.text || "[]"
    const generatedRooms = JSON.parse(responseText)

    // 3. Save rooms + objects to database
    if (palace.documents.length > 0) {
      const allLabels: string[] = []

      for (let ri = 0; ri < generatedRooms.length; ri++) {
        const roomData = generatedRooms[ri]
        
        // Create Room
        const room = await prisma.room.create({
          data: {
            palaceId: palace.id,
            roomKey: roomData.room_key,
            orderIndex: ri,
          }
        })

        // Create Objects for this Room
        const objectsData = roomData.objects.map((obj: any) => ({
          roomId: room.id,
          documentId: palace.documents[0]?.id || "dummy",
          label: obj.label,
          description: obj.description,
          modelKey: obj.model_key,
          colorHint: obj.color_hint,
          orderIndex: obj.order_index,
          sampleQuestion: obj.sample_question,
          metadata: obj.metadata,
        }))

        await prisma.object.createMany({ data: objectsData })
        allLabels.push(...objectsData.map((o: any) => o.label))
      }

      // 4. Upload to Moorcheh Namespace
      const namespace = `${process.env.MOORCHEH_PREFIX || ''}Palace${palace.id}`
      await createNamespace(namespace)
      
      const enrichedChunks = documentChunks.map(chunk => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          objectLabels: allLabels
        }
      }))

      if (enrichedChunks.length > 0) {
        await uploadToMoorcheh(namespace, enrichedChunks).catch(err => console.error("Non-fatal Moorcheh upload error:", err))
      }
    }

    // 5. Update status
    await prisma.palace.update({
      where: { id: palaceId },
      data: { status: 'ready' }
    })

  } catch (error) {
    console.error("Error processing documents:", error)
    await prisma.palace.update({
      where: { id: palaceId },
      data: { status: 'error' }
    })
  }
}
