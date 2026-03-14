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
            mesh_parts: {
              type: Type.ARRAY,
              description: "Compound 3D mesh definition: an array of primitive parts that compose this object. Each part has its own shape, color, position, and scale. Use NEON/bright colors like #ff00ff, #00ffff, #ffff00.",
              items: {
                type: Type.OBJECT,
                properties: {
                  primitive: { type: Type.STRING, enum: ["box", "sphere", "cylinder", "cone", "torus", "icosahedron", "octahedron"] },
                  color: { type: Type.STRING, description: "Hex color, e.g. '#ff00ff'. Must be a shocking neon color." },
                  position: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y, z] local offset from group center" },
                  scale: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y, z] scale, e.g. [1, 1, 1]" }
                },
                required: ["primitive", "color", "position", "scale"]
              }
            },
            metadata: {
              type: Type.OBJECT,
              properties: {
                importance: { type: Type.STRING, enum: ["high", "medium", "low"] },
                relationships: { type: Type.ARRAY, items: { type: Type.STRING } },
                source_hint: { type: Type.STRING }
              }
            }
          },
          required: ["label", "description", "model_key", "order_index", "sample_question", "mesh_parts"]
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
      Each room MUST contain between 2 and 5 objects. NEVER EXCEED 5 OBJECTS PER ROOM.
      Group related concepts into the same room. Order objects within each room logically.
      
      For each object, you must define 'mesh_parts': an array of 1-3 primitive shapes that compose
      the object. Be creative: a book = flat box; a key = thin cylinder + tiny sphere at top;
      a flask = cylinder + smaller sphere; a torch = thin cylinder + cone on top.
      Use SHOCKING NEON COLORS like #ff00ff, #00ffff, #ccff00, #ff6600 so the user can immediately
      spot them against the dark medieval background. Position parts relative to group center.
      Each part: { primitive, color, position: [x,y,z], scale: [x,y,z] }
      
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
        for (let oi = 0; oi < roomData.objects.length; oi++) {
          const obj = roomData.objects[oi]

          // Upload mesh_parts definition to Supabase Storage
          let meshUrl: string | null = null
          if (obj.mesh_parts && obj.mesh_parts.length > 0) {
            const meshJson = JSON.stringify({ parts: obj.mesh_parts })
            const meshPath = `meshes/${palace.id}/${room.id}-${oi}.json`
            const { error: meshErr } = await supabase.storage
              .from('palace-models')
              .upload(meshPath, meshJson, { contentType: 'application/json', upsert: true })
            if (meshErr) {
              console.error(`Non-fatal: failed to upload mesh for object ${oi}:`, meshErr)
            } else {
              const { data: urlData } = supabase.storage
                .from('palace-models')
                .getPublicUrl(meshPath)
              meshUrl = urlData.publicUrl
            }
          }

          const createdObj = await prisma.object.create({
            data: {
              roomId: room.id,
              documentId: palace.documents[0]?.id || "dummy",
              label: obj.label,
              description: obj.description,
              modelKey: obj.model_key,
              colorHint: obj.color_hint,
              orderIndex: obj.order_index,
              sampleQuestion: obj.sample_question,
              metadata: { ...obj.metadata, meshUrl },
            }
          })
          allLabels.push(createdObj.label)
        }
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
