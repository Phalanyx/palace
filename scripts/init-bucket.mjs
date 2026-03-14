import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

// Simple manual .env parser so we don't need to install dotenv
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
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = val // Service role takes precedence if present
    }
  })
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log(`Setting up bucket... (connecting to ${supabaseUrl})`)
  const { data, error } = await supabase.storage.createBucket('palace-documents', {
    public: false,
    fileSizeLimit: 52428800 // 50MB
  })
  
  if (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
      console.log('✅ Bucket "palace-documents" already exists')
    } else {
      console.error('❌ Error creating bucket:', error)
      process.exit(1)
    }
  } else {
    console.log('✅ Bucket "palace-documents" created successfully')
  }
}

main()
