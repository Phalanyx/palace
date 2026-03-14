import { redirect } from "next/navigation"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function requireApiUser() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user, response: null }
}

export async function requirePalaceAccess(palaceId: string) {
  const auth = await requireApiUser()

  if (!auth.user) {
    return auth
  }

  const palace = await prisma.palace.findFirst({
    where: {
      id: palaceId,
      userId: auth.user.id,
    },
  })

  if (!palace) {
    return {
      user: auth.user,
      palace: null,
      response: NextResponse.json({ error: "Palace not found" }, { status: 404 }),
    }
  }

  return { user: auth.user, palace, response: null }
}
