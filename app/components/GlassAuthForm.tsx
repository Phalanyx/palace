"use client"

import { useState, useMemo, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"


export default function GlassAuthForm() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [mode, setMode] = useState<"login" | "signup">("login")
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

return (
    <div className="w-full max-w-md flex flex-col items-center">
      {/* Logo sits above the card */}
      <div className="mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/palace_logo.png" alt="Palace" className="h-24 w-auto" />
      </div>

    <div className="w-full bg-white/20 backdrop-blur-3xl rounded-3xl px-8 py-10 shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>

      {/* Title */}
      <h2 className="text-4xl font-bold text-white text-center mb-2 tracking-tight">
        {isSignup ? "Create Account" : "Welcome Back"}
      </h2>
      <p className="text-white/70 text-center text-base mb-8">
        {isSignup ? "Start building your memory palace." : "Pick up right where you left off."}
      </p>

      {/* Error / success */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-2xl bg-red-500/20 border border-red-400/30 text-red-100 text-sm text-center">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 px-4 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-sm text-center">
          {message}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-white text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="glass-input w-full bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4 text-white placeholder-white/40 text-base outline-none transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.25)' }}
          />
        </div>

        <div>
          <label className="block text-white text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="glass-input w-full bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4 text-white placeholder-white/40 text-base outline-none transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.25)' }}
          />
          {isSignup && <p className="text-white/40 text-sm mt-2">At least 6 characters</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-white/30 hover:bg-white/40 backdrop-blur-sm rounded-2xl py-4 text-white font-semibold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          style={{ border: '1px solid rgba(255,255,255,0.3)' }}
        >
          {isPending && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {isPending ? "Loading..." : isSignup ? "Sign Up" : "Log In"}
        </button>
      </form>

      {/* Toggle */}
      <p className="text-white/50 text-center text-sm mt-8">
        {isSignup ? "Already have an account? " : "Need an account? "}
        <button
          onClick={() => { setMode(isSignup ? "login" : "signup"); setError(null); setMessage(null) }}
          className="text-white font-bold hover:underline"
        >
          {isSignup ? "Log in" : "Sign up"}
        </button>
      </p>
    </div>
    </div>
  )
}
