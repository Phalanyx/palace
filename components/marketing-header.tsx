"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { CircleHelpIcon, LayoutGridIcon } from "lucide-react"

import { UserDropdown } from "@/components/user-dropdown"
import { Button } from "@/components/ui/button"

interface MarketingHeaderProps {
  user?: User | null
}

const navItems = [
  { value: "how-it-works", href: "/#how-it-works", label: "How it works", icon: CircleHelpIcon },
  { value: "highlights", href: "/#highlights", label: "Highlights", icon: LayoutGridIcon },
]

export function MarketingHeader({ user }: MarketingHeaderProps) {
  const [activeNavTab, setActiveNavTab] = useState(navItems[0].value)

  useEffect(() => {
    const syncActiveTab = () => {
      const hash = window.location.hash.replace("#", "")
      const matchingTab = navItems.find(({ value }) => value === hash)
      setActiveNavTab(matchingTab?.value ?? navItems[0].value)
    }

    syncActiveTab()
    window.addEventListener("hashchange", syncActiveTab)

    return () => window.removeEventListener("hashchange", syncActiveTab)
  }, [])

  function handleNavChange(value: string) {
    const section = document.getElementById(value)

    if (!section) {
      window.location.assign(`/#${value}`)
      return
    }

    setActiveNavTab(value)
    section.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", `/#${value}`)
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="dashboard-header-shell mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <Link href="/" className="dashboard-brand-lockup transition-transform hover:-translate-y-0.5">
            <div className="dashboard-brand-mark">
              <span className="dark:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/palace_logo_black.png" alt="Palace" className="h-12 w-auto sm:h-14" />
              </span>
              <span className="hidden dark:inline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/palace_logo.png" alt="Palace" className="h-12 w-auto sm:h-14" />
              </span>
            </div>
          </Link>
        </div>

        <nav
          aria-label="Landing page navigation"
          className="dashboard-nav hidden items-center gap-1 md:flex"
        >
          {navItems.map(({ value, label, icon: Icon }) => {
            const isActive = value === activeNavTab

            return (
              <button
                key={value}
                type="button"
                onClick={() => handleNavChange(value)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "dashboard-nav-button flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive ? "dashboard-nav-button-active" : "dashboard-nav-button-idle",
                ].join(" ")}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          {user ? (
            <>
              <Button
                variant="outline"
                asChild
                className="dashboard-pill hidden rounded-xl px-4 text-sm font-medium text-[color:var(--dashboard-text)] transition-all duration-200 hover:bg-[color:color-mix(in_srgb,var(--dashboard-surface-strong)_90%,transparent)] hover:text-[color:var(--dashboard-text)] sm:inline-flex"
              >
                <Link href="/dashboard">
                  My Memory Palaces
                </Link>
              </Button>
              <UserDropdown user={user} />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className="dashboard-nav-button dashboard-nav-button-idle rounded-xl px-4 text-sm font-medium"
              >
                <Link href="/login">
                  Log in
                </Link>
              </Button>
              <Button
                asChild
                className="dashboard-nav-button-active rounded-xl px-4 text-sm font-medium text-[color:var(--dashboard-text)] shadow-lg shadow-primary/15"
              >
                <Link href="/signup">
                  Start building
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-2 px-4 pb-3 md:hidden sm:px-6 lg:px-8">
        {navItems.map(({ value, label, icon: Icon }) => {
          const isActive = value === activeNavTab

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleNavChange(value)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "dashboard-nav-button flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                isActive ? "dashboard-nav-button-active" : "dashboard-nav-button-idle",
              ].join(" ")}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
