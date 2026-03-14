import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

// Simple manual .env parser
let supabaseUrl = ''
let supabaseKey = ''

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = val
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = val // Service role takes precedence
    }
  })
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or supabase key in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function ensureBucket(name, options = {}) {
  // Check if bucket already exists
  const { data: existing } = await supabase.storage.getBucket(name)
  if (existing) {
    console.log(`✅ Bucket "${name}" already exists`)
    return
  }

  const { error } = await supabase.storage.createBucket(name, options)
  if (error) {
    // Treat "already exists" errors as success
    if (error.message?.includes('already exists') || error.message?.includes('Duplicate')) {
      console.log(`✅ Bucket "${name}" already exists`)
    } else {
      console.error(`❌ Error creating bucket "${name}":`, error.message)
      process.exit(1)
    }
  } else {
    console.log(`✅ Bucket "${name}" created successfully`)
  }
}

async function main() {
  console.log(`Connecting to ${supabaseUrl}...`)

  // Private bucket for user documents
  await ensureBucket('palace-documents', {
    public: false,
    fileSizeLimit: 52428800 // 50MB
  })

  // Public bucket for dynamically generated 3D mesh JSON files
  await ensureBucket('palace-models', {
    public: true,
    fileSizeLimit: 1048576 // 1MB — mesh JSON files are tiny
  })

  console.log('\n🏰 All storage buckets ready!')
}

main()
