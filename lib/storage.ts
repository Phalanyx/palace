import { createClient } from '@supabase/supabase-js'

export async function uploadDocument(file: File, palaceId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const path = `${palaceId}/${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from('palace-documents')
    .upload(path, file)
    
  if (error) throw error
  return data.path
}
