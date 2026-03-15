import Link from "next/link"
import { User } from "@supabase/supabase-js"
import { CastleIcon, CompassIcon, SparklesIcon } from "lucide-react"

import { UserDropdown } from "@/components/user-dropdown"
import { Button } from "@/components/ui/button"

interface MarketingHeaderProps {
  user?: User | null
}

const navItems = [
  { href: "/#how-it-works", label: "How it works", icon: CompassIcon },
  { href: "/#highlights", label: "Highlights", icon: SparklesIcon },
]

export function MarketingHeader({ user }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--landing-line)] bg-[color:color-mix(in_srgb,var(--landing-footer-bg)_82%,transparent)] backdrop-blur-2xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 transition-transform hover:-translate-y-0.5">
          <div className="flex size-11 items-center justify-center rounded-[1.35rem] border border-[color:var(--landing-line)] bg-[color:var(--landing-pill-bg)] text-primary shadow-lg shadow-black/10 dark:shadow-black/20">
            <CastleIcon className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-[family-name:var(--font-baloo)] text-2xl leading-none text-[color:var(--landing-text)]">
              Palace
            </span>
            <span className="hidden text-xs text-[color:var(--landing-text-soft)] sm:block">
              Study worlds with sticky recall
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              asChild
              className="rounded-full px-3 text-sm text-[color:var(--landing-text-soft)] hover:bg-[color:var(--landing-pill-bg)] hover:text-[color:var(--landing-text)]"
            >
              <a href={href}>
              <Icon className="size-4 text-primary/70" />
              {label}
              </a>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="outline"
                asChild
                className="hidden rounded-full border-[color:var(--landing-line)] bg-[color:var(--landing-pill-bg)] px-4 text-[color:var(--landing-text)] hover:bg-[color:color-mix(in_srgb,var(--landing-pill-bg)_84%,var(--landing-text)_8%)] hover:text-[color:var(--landing-text)] sm:inline-flex"
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
                className="rounded-full text-[color:var(--landing-text-soft)] hover:bg-[color:var(--landing-pill-bg)] hover:text-[color:var(--landing-text)]"
              >
                <Link href="/login">
                Log in
                </Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-primary px-4 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                <Link href="/signup">
                Start building
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
