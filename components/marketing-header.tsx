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
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-[#EEF2FF]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 transition-transform hover:-translate-y-0.5">
          <div className="flex size-11 items-center justify-center rounded-[1.35rem] border border-primary/15 bg-white/80 text-primary shadow-lg shadow-primary/10">
            <CastleIcon className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-[family-name:var(--font-baloo)] text-2xl leading-none text-foreground">
              Palace
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Study worlds with sticky recall
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              render={<a href={href} />}
              nativeButton={false}
              className="rounded-full px-3 text-sm text-muted-foreground hover:bg-white/70 hover:text-foreground"
            >
              <Icon className="size-4 text-primary/70" />
              {label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="outline"
                render={<Link href="/dashboard" />}
                nativeButton={false}
                className="hidden rounded-full border-primary/15 bg-white/70 px-4 sm:inline-flex"
              >
                My Memory Palaces
              </Button>
              <UserDropdown user={user} />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                render={<Link href="/login" />}
                nativeButton={false}
                className="rounded-full text-muted-foreground hover:bg-white/70 hover:text-foreground"
              >
                Log in
              </Button>
              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                className="rounded-full bg-primary px-4 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                Start building
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
