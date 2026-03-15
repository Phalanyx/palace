import Link from "next/link"
import { CastleIcon } from "lucide-react"

import { AuthForm } from "@/components/auth/auth-form"

type AuthMode = "login" | "signup"

const pageContent = {
  login: {
    quote: "Landing for discovery. Dashboard for actual work.",
  },
  signup: {
    quote: "Create an account, then move straight into the dashboard.",
  },
} satisfies Record<AuthMode, { quote: string }>

export function AuthRoutePage({
  mode,
  nextPath,
}: {
  mode: AuthMode
  nextPath: string
}) {
  const copy = pageContent[mode]

  return (
    <div className="grid min-h-svh bg-[color:var(--auth-screen-bg)] text-[color:var(--auth-text)] lg:grid-cols-2">
      <div className="flex flex-col gap-4 bg-[color:var(--auth-panel-form-bg)] p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium text-[color:var(--auth-text)]">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CastleIcon className="size-4" />
            </div>
            Palace
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <AuthForm mode={mode} nextPath={nextPath} />
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[color:var(--auth-panel-story-bg)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--auth-text)_6%,transparent),transparent_38%),linear-gradient(180deg,color-mix(in_srgb,var(--auth-panel-story-bg)_92%,transparent),color-mix(in_srgb,var(--auth-panel-story-bg)_92%,transparent))]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-[color:var(--auth-text)]">
          <div className="flex justify-end">
            <div className="inline-flex rounded-xl border border-[color:var(--auth-border)] bg-[color:var(--auth-surface)] px-3 py-2 text-sm text-[color:var(--auth-text-muted)]">
              Memory workspace
            </div>
          </div>

          <div className="mx-auto flex max-w-xl flex-1 items-center">
            <div className="relative pl-8 text-[clamp(2rem,3vw,3.6rem)] leading-[1.12] tracking-[-0.04em] text-[color:var(--auth-text)]">
              <span className="absolute left-0 top-[-0.6rem] text-7xl text-[color:color-mix(in_srgb,var(--auth-text)_8%,transparent)]">“</span>
              {copy.quote}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
