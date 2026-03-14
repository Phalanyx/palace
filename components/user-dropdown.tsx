"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { User } from "@supabase/supabase-js"
import { FlaskConical, Newspaper, Settings } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserDropdown({ user, userName }: { user: User; userName?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const resolvedUserName =
    userName ||
    getMetadataString(user, "full_name") ||
    getMetadataString(user, "name") ||
    ""

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace("/login")
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full h-8 w-8" />}>
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
          {resolvedUserName
            ? resolvedUserName.split(" ").map((n) => n[0]?.toUpperCase()).join("").slice(0, 2)
            : user.email?.[0]?.toUpperCase() || "U"}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1 rounded-sm text-xs">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal px-2 py-1.5">
            {resolvedUserName ? (
              <p className="text-xs font-semibold leading-tight truncate">
                {resolvedUserName}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {user.email}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <div className="h-[1px] bg-border/50 mx-1 my-0.5" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link href="/settings" />}
            className="py-1 px-2 text-xs rounded-none"
          >
            <Settings size={13} className="mr-2 text-muted-foreground" />
            Account preferences
          </DropdownMenuItem>
          <DropdownMenuItem className="py-1 px-2 text-xs rounded-none" disabled>
            <FlaskConical size={13} className="mr-2 text-muted-foreground" />
            Feature previews
          </DropdownMenuItem>
          <DropdownMenuItem className="py-1 px-2 text-xs rounded-none" disabled>
            <Newspaper size={13} className="mr-2 text-muted-foreground" />
            Changelog
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <div className="h-[1px] bg-border/50 mx-1 my-0.5" />

        <DropdownMenuItem
          disabled={isPending}
          onClick={handleLogout}
          className="py-1 px-2 text-xs rounded-none"
        >
          {isPending ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getMetadataString(user: User, key: string) {
  const value = user.user_metadata?.[key]
  return typeof value === "string" ? value : ""
}
