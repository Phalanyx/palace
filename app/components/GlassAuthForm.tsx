"use client"

import { type FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/glass/tabs"
import { createClient } from "@/lib/supabase/client"

type AuthMode = "login" | "signup"

const authCopy: Record<
  AuthMode,
  {
    title: string
    description: string
    submitLabel: string
    footerLabel: string
    toggleLabel: string
  }
> = {
  login: {
    title: "Welcome Back",
    description: "Pick up right where you left off.",
    submitLabel: "Log In",
    footerLabel: "Need an account?",
    toggleLabel: "Sign up",
  },
  signup: {
    title: "Create Account",
    description: "Start building your memory palace.",
    submitLabel: "Sign Up",
    footerLabel: "Already have an account?",
    toggleLabel: "Log in",
  },
}

export default function GlassAuthForm() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isSignup = mode === "signup"

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsPending(true)
    try {
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
        })
        if (err) throw err
        if (data.session) { router.replace("/dashboard"); router.refresh(); return }
        setMessage("Check your email to confirm your account.")
        return
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      router.replace("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.")
    } finally {
      setIsPending(false)
    }
  }

  function handleModeChange(value: string) {
    if (value !== "login" && value !== "signup") {
      return
    }

    setMode(value)
    setError(null)
    setMessage(null)
  }

  function renderPanel(currentMode: AuthMode) {
    const currentCopy = authCopy[currentMode]
    const showSignupHint = currentMode === "signup"

    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-white">
            {currentCopy.title}
          </h2>
          <p className="text-base text-white/70">
            {currentCopy.description}
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/20 px-4 py-3 text-center text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/20 px-4 py-3 text-center text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="glass-input w-full rounded-2xl bg-white/20 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-white/25"
              style={{ border: "1px solid rgba(255,255,255,0.25)" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={showSignupHint ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="glass-input w-full rounded-2xl bg-white/20 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-white/25"
              style={{ border: "1px solid rgba(255,255,255,0.25)" }}
            />
            {showSignupHint ? (
              <p className="text-sm text-white/45">At least 6 characters</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/30 py-4 text-base font-semibold text-white transition-all hover:bg-white/40 disabled:opacity-50"
            style={{ border: "1px solid rgba(255,255,255,0.3)" }}
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Loading..." : currentCopy.submitLabel}
          </button>
        </form>

        <p className="text-center text-sm text-white/50">
          {currentCopy.footerLabel}{" "}
          <button
            type="button"
            onClick={() => handleModeChange(currentMode === "signup" ? "login" : "signup")}
            className="font-bold text-white hover:underline"
          >
            {currentCopy.toggleLabel}
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Logo sits above the card */}
      <div className="mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/palace_logo.png" alt="Palace" className="h-24 w-auto" />
      </div>

      <div
        className="w-full rounded-[2rem] px-6 py-6 text-white shadow-[0_30px_80px_rgba(8,12,30,0.36)] sm:px-8 sm:py-8"
        style={{ border: "1px solid rgba(255,255,255,0.25)" }}
      >
        <Tabs value={mode} onValueChange={handleModeChange} className="w-full gap-6">
          <TabsList
            hover="lift"
            className="grid w-full grid-cols-2 gap-1.5 rounded-[1.4rem] p-1.5"
          >
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            {renderPanel("login")}
          </TabsContent>
          <TabsContent value="signup" className="mt-0">
            {renderPanel("signup")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
