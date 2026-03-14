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
              description: "Compound 3D mesh definition: 1-3 primitives composing this object. MUST reflect the ROOM CONTEXT first (e.g., kitchen → food/pots, bedroom → candles/crowns, library → books/scrolls, great_hall → swords/shields). Color must be shocking neon (#ff00ff, #00ffff, #ccff00, #ff6600) to stand out in a dark scene.",
              items: {
                type: Type.OBJECT,
                properties: {
                  primitive: { type: Type.STRING, enum: ["box", "sphere", "cylinder", "cone", "torus", "icosahedron", "octahedron"] },
                  color: { type: Type.STRING, description: "Hex color — MUST be a shocking neon like #ff00ff, #00ffff, #ccff00, #ff6600, #ff0066" },
                  position: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y, z] local offset from group center" },
                  scale: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y, z] scale. Keep reasonable: e.g. [0.5, 0.8, 0.5]" }
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
      
      For each object, create 'mesh_parts': 1-3 primitives that form a recognizable thematic object.
      
      THE ROOM CONTEXT IS THE TOP PRIORITY for mesh shape:
      - bedroom: pillow (flat box), crown (torus + cylinder), candle (thin cylinder + sphere top),
                  ring (torus), goblet (cylinder + sphere base)
      - great_hall: sword (tall thin cylinder + flat box hilt), shield (flat box), chalice (cylinder
                    + inverted cone base), banner (flat box), axe (box + diamond icosahedron)
      - kitchen: pot (cylinder + torus rim), bread loaf (sphere, squashed), apple (sphere + tiny
                 cone stem), ladle (cylinder + sphere bowl), fish (icosahedron)
      - library: open book (two thin boxes angled), scroll (cylinder), quill (cone + cylinder),
                 lantern (cylinder + cone top), hourglass (two cones touching points)
      
      Use SHOCKING NEON COLORS: #ff00ff, #00ffff, #ccff00, #ff6600, #ff0088, #00ff88
      so the user can immediately spot them against the dark medieval background.
      Position parts relative to group center (object sits at y=0 by default).
      
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

          // Upload mesh_parts to Supabase Storage
          let meshUrl: string | null = null
          if (obj.mesh_parts && obj.mesh_parts.length > 0) {
            console.log(`  Uploading mesh for "${obj.label}" (${obj.mesh_parts.length} parts, room: ${roomData.room_key})`)
            const meshJson = JSON.stringify({ parts: obj.mesh_parts })
            const meshPath = `meshes/${palace.id}/${room.id}-${oi}.json`
            const { error: meshErr } = await supabase.storage
              .from('palace-models')
              .upload(meshPath, meshJson, { contentType: 'application/json', upsert: true })
            if (meshErr) {
              console.error(`  ❌ Mesh upload failed for "${obj.label}": ${meshErr.message}`)
            } else {
              const { data: urlData } = supabase.storage
                .from('palace-models')
                .getPublicUrl(meshPath)
              meshUrl = urlData.publicUrl
              console.log(`  ✅ Mesh uploaded: ${meshUrl}`)
            }
          } else {
            console.warn(`  ⚠️ No mesh_parts for "${obj.label}" — falling back to default mesh`)
          }

          // Create Object record
          const createdObj = await prisma.object.create({
            data: {
              roomId: room.id,
              documentId: palace.documents[0]?.id || "dummy",
              label: obj.label,
              description: obj.description,
              modelKey: obj.model_key || 'custom',
              colorHint: obj.color_hint,
              orderIndex: obj.order_index,
              sampleQuestion: obj.sample_question,
              metadata: obj.metadata ?? {},
            }
          })

          // Create Mesh record in DB (if we have a storage URL)
          if (meshUrl) {
            await prisma.mesh.create({
              data: {
                objectId: createdObj.id,
                storageUrl: meshUrl,
                roomKey: roomData.room_key,
              }
            })
          }

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
