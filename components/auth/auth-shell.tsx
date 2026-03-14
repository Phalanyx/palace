import Link from "next/link"
import {
  ArrowLeftIcon,
  CastleIcon,
} from "lucide-react"

import { AuthForm } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"

type AuthMode = "login" | "signup"

interface AuthShellProps {
  mode: AuthMode
  nextPath: string
}

const authContent = {
  login: {
    title: "Sign in",
    description: "Continue building your memory palace.",
    quote: "Landing for discovery. Dashboard for actual work.",
  },
  signup: {
    title: "Get started",
    description: "Create a new account.",
    quote: "A simpler auth flow keeps the landing public and the workspace focused.",
  },
} satisfies Record<
  AuthMode,
  {
    title: string
    description: string
    quote: string
  }
>

export function AuthShell({ mode, nextPath }: AuthShellProps) {
  const copy = authContent[mode]

  return (
    <main className="auth-screen">
      <div className="auth-shell">
        <section className="auth-panel auth-panel-form">
          <div className="auth-panel-inner">
            <div className="auth-shell-brandbar">
              <Link href="/" className="auth-shell-brandlink">
                <div className="auth-brand-mark">
                  <CastleIcon />
                </div>
                <span className="font-[family-name:var(--font-baloo)] text-3xl leading-none text-white">
                  Palace
                </span>
              </Link>
            </div>

            <div className="auth-form-shell">
              <div className="auth-page-copy">
                <h1 className="auth-title">{copy.title}</h1>
                <p className="auth-description">{copy.description}</p>
              </div>

              <AuthForm mode={mode} nextPath={nextPath} />
            </div>
          </div>
        </section>

        <section className="auth-panel auth-panel-story">
          <div className="auth-story-panel">
            <div className="auth-story-topbar">
              <div className="auth-story-logo">
                <CastleIcon />
                <span>palace</span>
              </div>
              <div className="auth-chip">Memory workspace</div>
            </div>

            <div className="auth-story-quote">
              <span className="auth-story-quote-mark">“</span>
              <p>{copy.quote}</p>
            </div>

            <div className="auth-story-proof">
              <div>
                <p className="auth-story-proof-label">Simple structure</p>
                <p className="auth-story-proof-title">Clean sign-in on the left. Product context on the right.</p>
              </div>
            </div>

            <Button variant="ghost" asChild className="auth-story-backlink">
              <Link href="/">
                <ArrowLeftIcon data-icon="inline-start" />
                Back to home
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
