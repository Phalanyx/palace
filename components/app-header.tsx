import { User } from "@supabase/supabase-js"
import { CastleIcon } from "lucide-react"

import { UserDropdown } from "@/components/user-dropdown"

interface AppHeaderProps {
  user: User
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-[#EEF2FF]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-[1.4rem] border border-primary/15 bg-white/85 text-primary shadow-lg shadow-primary/10">
            <CastleIcon className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
              Dashboard
            </span>
            <h1 className="font-[family-name:var(--font-baloo)] text-3xl leading-none text-foreground">
              My Memory Palaces
            </h1>
          </div>
        </div>

        <UserDropdown user={user} />
      </div>
    </header>
  )
}
