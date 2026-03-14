import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseEnv } from "@/lib/supabase/env"

export async function createClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components can read auth cookies even when they cannot write them.
        }
      },
    },
  })
}
