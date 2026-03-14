"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronDownIcon, LoaderCircleIcon, LogOutIcon, Settings2Icon, SparklesIcon } from "lucide-react"
import { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserDropdown({ user }: { user: User }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const initials = user.email
    ? user.email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 2)
        .toUpperCase() || "MP"
    : "MP"

  async function handleLogout() {
    setIsPending(true)
    const supabase = createClient()

    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-auto rounded-full px-1.5 py-1" />}>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-1.5 py-1 shadow-sm shadow-primary/5 transition-colors hover:bg-background">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/12 font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 sm:flex sm:flex-col sm:items-start">
            <span className="max-w-36 truncate text-sm font-medium text-foreground">
              {user.email?.split("@")[0] ?? "Learner"}
            </span>
            <span className="max-w-40 truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="px-2 py-2">
          <p className="text-sm font-semibold text-foreground">
            {user.email?.split("@")[0] ?? "Memory Palace user"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard" />}>
            <SparklesIcon className="text-primary" />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings2Icon className="text-muted-foreground" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onClick={handleLogout}
        >
          {isPending ? <LoaderCircleIcon className="animate-spin" /> : <LogOutIcon />}
          {isPending ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
