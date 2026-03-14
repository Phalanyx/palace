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
    <div className="grid min-h-svh bg-[#0d1117] lg:grid-cols-2">
      <div className="flex flex-col gap-4 bg-[#111318] p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium text-white">
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

      <div className="relative hidden overflow-hidden bg-[#090b10] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_38%),linear-gradient(180deg,rgba(8,10,14,0.92),rgba(8,10,14,0.92))]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div className="flex justify-end">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
              Memory workspace
            </div>
          </div>

          <div className="mx-auto flex max-w-xl flex-1 items-center">
            <div className="relative pl-8 text-[clamp(2rem,3vw,3.6rem)] leading-[1.12] tracking-[-0.04em] text-white/95">
              <span className="absolute left-0 top-[-0.6rem] text-7xl text-white/8">“</span>
              {copy.quote}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
