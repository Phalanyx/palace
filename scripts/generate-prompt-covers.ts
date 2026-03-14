/**
 * One-off script: generate low-poly cover images for the prompt library
 * and upload them to Supabase storage.
 *
 * Usage:  npx tsx scripts/generate-prompt-covers.ts
 */
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { PROMPT_LIBRARY } from '../lib/promptLibrary'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function generateCover(id: string, title: string, prompt: string): Promise<string> {
  const imagePrompt =
    `Low-poly 3D render of a scene about "${title}". ` +
    `Show iconic objects and environments unique to this subject — NOT a generic landscape or campsite. ` +
    `Faceted geometric polygons, flat-shaded triangulated faces. ` +
    `Use these colors: forest green, moss green, deep teal, muted sand, stone gray, muted purple, warm orange, amber yellow, frost teal, deep cyan, olive, soft red, and slate blue. ` +
    `Soft dramatic lighting, clean composition. ` +
    `ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO LABELS, NO WRITING of any kind anywhere in the image.`

  const result = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: { numberOfImages: 1, aspectRatio: '16:9' },
  })

  const imageBytes = result.generatedImages?.[0]?.image?.imageBytes
  if (!imageBytes) throw new Error(`No image bytes for ${id}`)

  const rawBuffer = Buffer.from(imageBytes as string, 'base64')
  const buffer = await sharp(rawBuffer)
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  const storagePath = `prompt-covers/${id}.jpg`
  const { error } = await supabase.storage
    .from('palace-models')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from('palace-models').getPublicUrl(storagePath)
  return data.publicUrl
}

async function main() {
  const results: Record<string, string> = {}

  for (const p of PROMPT_LIBRARY) {
    process.stdout.write(`Generating ${p.id}...`)
    try {
      const url = await generateCover(p.id, p.title, p.prompt)
      results[p.id] = url
      console.log(` done`)
    } catch (err) {
      console.error(` FAILED:`, err)
    }
  }

  console.log('\n--- URL mapping (paste into promptLibrary.ts) ---')
  for (const [id, url] of Object.entries(results)) {
    console.log(`  "${id}": "${url}",`)
  }
}

main()
