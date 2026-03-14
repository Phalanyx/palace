"use client"

import { useRouter } from "next/navigation"
import { LogOutIcon, LoaderCircleIcon } from "lucide-react"
import { useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface LogoutButtonProps {
  variant?: "ghost" | "outline"
  className?: string
}

export function LogoutButton({ variant = "ghost", className }: LogoutButtonProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleLogout() {
    setIsPending(true)
    const supabase = createClient()

    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <Button
      variant={variant}
      className={cn("justify-start", className)}
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? <LoaderCircleIcon className="animate-spin" /> : <LogOutIcon />}
      Log out
    </Button>
  )
}
