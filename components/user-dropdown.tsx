"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useSyncExternalStore, useTransition } from "react"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/glass/dropdown-menu"

const themeOptions = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
] as const

export function UserDropdown({ user, userName }: { user: User; userName?: string }) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isMounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot)
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
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {resolvedUserName
              ? resolvedUserName.split(" ").map((n) => n[0]?.toUpperCase()).join("").slice(0, 2)
              : user.email?.[0]?.toUpperCase() || "U"}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        glow
        className="user-dropdown-content w-56 rounded-2xl p-1.5 text-xs"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="user-dropdown-label px-2.5 py-2">
            {resolvedUserName ? (
              <p className="truncate text-xs font-semibold leading-tight text-foreground">
                {resolvedUserName}
              </p>
            ) : null}
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {user.email}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="user-dropdown-separator" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            asChild
            className="user-dropdown-item rounded-xl px-2.5 py-2 text-xs"
          >
            <Link href="/settings">
              <Settings className="text-muted-foreground" />
              Account preferences
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="user-dropdown-item rounded-xl px-2.5 py-2 text-xs" disabled>
            <FlaskConical className="text-muted-foreground" />
            Feature previews
          </DropdownMenuItem>
          <DropdownMenuItem className="user-dropdown-item rounded-xl px-2.5 py-2 text-xs" disabled>
            <Newspaper className="text-muted-foreground" />
            Changelog
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="user-dropdown-separator" />

        <div className="px-2.5 py-2">
          <span className="text-[11px] font-medium text-muted-foreground">Theme</span>
          <div className="mt-1.5 flex flex-col gap-1">
            {(isMounted ? themeOptions : []).map(({ value, label }) => {
              const isSelected = theme === value

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className="user-dropdown-theme-option"
                >
                  <span
                    aria-hidden="true"
                    className={isSelected ? "user-dropdown-theme-dot user-dropdown-theme-dot-active" : "user-dropdown-theme-dot"}
                  />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="user-dropdown-separator" />

        <DropdownMenuItem
          disabled={isPending}
          onSelect={handleLogout}
          className="user-dropdown-item rounded-xl px-2.5 py-2 text-xs"
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

function subscribeToClient() {
  return () => {}
}

function getClientSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}
