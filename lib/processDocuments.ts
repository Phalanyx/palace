import { GoogleGenAI, Type } from "@google/genai"
import { prisma } from "./prisma"
import { uploadToMoorcheh, createNamespace } from "./moorcheh"
import { createClient } from '@supabase/supabase-js'
import { generateAllMeshes } from "./meshGenerator"
import sharp from 'sharp'
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
            label: { type: Type.STRING, description: "Short concept name, max 4 words" },
            description: { type: Type.STRING, description: "2-3 sentence explanation" },
            item_type: { type: Type.STRING, description: "A single everyday physical object that serves as a visual metaphor for this concept (e.g. 'Airplane', 'Book', 'Telescope', 'Popcorn', 'Anchor', 'Umbrella'). Must be a REAL tangible thing you could hold or see — NOT an abstract phrase. Must be UNIQUE across the palace." },
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
          required: ["label", "description", "item_type", "model_key", "order_index", "sample_question"]
        }
      }
    },
    required: ["room_key", "objects"]
  }
}

async function generateAndSaveCoverImage(
  palaceId: string,
  title: string,
  prompt: string,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const imagePrompt =
    `A stunning low-poly 3D landscape scene representing "${title}": ${prompt}. ` +
    `Geometric faceted polygons, vivid complementary colors, dramatic rim lighting, ` +
    `isometric fantasy atmosphere. Ultra-clean minimalist composition, no text, no labels.`

  const result = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: { numberOfImages: 1, aspectRatio: '16:9' },
  })

  const imageBytes = result.generatedImages?.[0]?.image?.imageBytes
  if (!imageBytes) throw new Error('No image bytes returned')

  const rawBuffer = Buffer.from(imageBytes as string, 'base64')
  console.log(`Cover image raw size: ${(rawBuffer.length / 1024 / 1024).toFixed(1)}MB`)

  // Compress to JPEG (max 1280px wide, 80% quality) to keep under storage limits
  const buffer = await sharp(rawBuffer)
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()
  console.log(`Cover image compressed size: ${(buffer.length / 1024).toFixed(0)}KB`)

  const storagePath = `covers/${palaceId}.jpg`

  const { error } = await supabase.storage
    .from('palace-models')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('palace-models')
    .getPublicUrl(storagePath)

  await prisma.palace.update({
    where: { id: palaceId },
    data: { coverImageUrl: urlData.publicUrl },
  })

  console.log(`Cover image saved for palace ${palaceId}`)
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

    // 1a. Generate cover image in the background — save to palace as soon as ready
    generateAndSaveCoverImage(palace.id, palace.title, palace.prompt).catch(err =>
      console.error('Non-fatal: cover image generation failed:', err)
    )

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
      Group related concepts into the same room thematically. Order objects within each room logically.

      ITEM SELECTION — this is the most important creative task:
      For each concept, choose a UNIQUE everyday physical object whose shape or symbolism metaphorically reflects the concept.
      The item_type must be a REAL, TANGIBLE thing you could hold, see, or touch — NOT an abstract phrase or concept.
      Ignore the room entirely when picking the item. Focus on the IDEA.
      Examples of concept → item mapping:
      - "Natural Selection" → Fossil
      - "Supply & Demand" → Balance Scale
      - "Ohm's Law" → Light Bulb
      - "DNA Replication" → Zipper
      - "The Fall of Rome" → Broken Pillar
      - "Photosynthesis" → Sunflower
      - "Entropy" → Melting Ice Cube
      - "Newton's First Law" → Bowling Ball
      - "Pilot Program" → Airplane
      - "Data Pipeline" → Funnel
      - "User Engagement" → Magnet
      - "Market Growth" → Sprout

      BAD item_types (NEVER do this): "Core CS Curriculum", "Automated Data Flow", "Digital Transformation", "System Architecture"
      GOOD item_types: Book, Compass, Anchor, Rocket, Hourglass, Magnifying Glass, Lighthouse, Parachute

      UNIQUENESS: Every item_type across the ENTIRE palace must be different. No two concepts may share the same item.

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

    // 3. Phase 1 — Save rooms + objects to database (sequential)
    if (palace.documents.length > 0) {
      const allLabels: string[] = []
      const savedObjects: { dbId: string; itemType: string; label: string; description: string; roomKey: string }[] = []

      for (let ri = 0; ri < generatedRooms.length; ri++) {
        const roomData = generatedRooms[ri]

        const room = await prisma.room.create({
          data: {
            palaceId: palace.id,
            roomKey: roomData.room_key,
            orderIndex: ri,
          }
        })

        for (let oi = 0; oi < roomData.objects.length; oi++) {
          const obj = roomData.objects[oi]

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
              metadata: { ...(obj.metadata ?? {}), itemType: obj.item_type ?? null },
            }
          })

          savedObjects.push({
            dbId: createdObj.id,
            itemType: obj.item_type,
            label: obj.label,
            description: obj.description,
            roomKey: roomData.room_key,
          })
          allLabels.push(createdObj.label)
        }
      }

      // 4. Phase 2 — Generate all meshes in a single batch Claude call, then upload
      console.log(`Generating meshes for ${savedObjects.length} objects...`)
      const allMeshes = await generateAllMeshes(
        savedObjects.map(s => ({ id: s.dbId, itemType: s.itemType, label: s.label, description: s.description }))
      )

      for (const saved of savedObjects) {
        const meshData = allMeshes[saved.dbId];
        const scriptContent = meshData ? meshData.code : `
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshPhysicalMaterial({ color: 0xff00ff });
          return new THREE.Mesh(geometry, material);
        `;
        const meshPath = `meshes/${palace.id}/${saved.dbId}.js`;

        const { error: meshErr } = await supabase.storage
          .from('palace-models')
          .upload(meshPath, scriptContent, { contentType: 'application/javascript', upsert: true })

        if (meshErr) {
          console.error(`  Mesh upload failed for "${saved.label}": ${meshErr.message}`)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('palace-models')
          .getPublicUrl(meshPath)

        await prisma.mesh.create({
          data: {
            objectId: saved.dbId,
            storageUrl: urlData.publicUrl,
            roomKey: saved.roomKey,
          }
        })
        console.log(`  Mesh ready: ${saved.label} (${saved.itemType})`)
      }

      // 5. Upload to Moorcheh Namespace
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
