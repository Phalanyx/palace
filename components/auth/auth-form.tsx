"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"
import {
  AlertCircleIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  MailIcon,
  SparklesIcon,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type AuthMode = "login" | "signup"

interface AuthFormProps {
  mode: AuthMode
  nextPath?: string
}

export function AuthForm({ mode, nextPath = "/dashboard" }: AuthFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isGooglePending, setIsGooglePending] = useState(false)

  const isSignup = mode === "signup"
  const title = isSignup ? "Create your account" : "Login to your account"
  const description = isSignup
    ? "Start building memory palaces."
    : "Enter your email below to login to your account."
  const alternateHref = `${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsPending(true)

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        })

        if (signUpError) {
          throw signUpError
        }

        if (data.session) {
          router.replace(nextPath)
          router.refresh()
          return
        }

        setMessage("Account created. Check your email if confirmation is enabled in Supabase.")
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      router.replace(nextPath)
      router.refresh()
    } catch (submissionError) {
      const messageText =
        submissionError instanceof Error ? submissionError.message : "Authentication failed."
      setError(messageText)
    } finally {
      setIsPending(false)
    }
  }

  async function handleGoogleRedirectSignIn() {
    setError(null)
    setMessage(null)
    setIsGooglePending(true)

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      })

      if (oauthError) {
        throw oauthError
      }

      if (data.url) {
        window.location.assign(data.url)
        return
      }

      throw new Error("Google sign-in could not start.")
    } catch (oauthFailure) {
      const messageText =
        oauthFailure instanceof Error ? oauthFailure.message : "Google sign-in failed."
      setError(messageText)
      setIsGooglePending(false)
    }
  }

  return (
    <section className="auth-form-card">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        <p className="text-sm leading-6 text-white/60">{description}</p>
      </div>

      <div className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive" className="auth-alert auth-alert-destructive">
            <AlertCircleIcon />
            <AlertTitle>There was a problem</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {message ? (
          <Alert className="auth-alert">
            <SparklesIcon />
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="auth-google-button"
            onClick={handleGoogleRedirectSignIn}
            disabled={isPending || isGooglePending}
          >
            <GoogleIcon />
            {isGooglePending ? "Loading..." : "Continue with Google"}
          </Button>

          {isGooglePending ? (
            <div className="flex items-center gap-2 text-sm text-white/55">
              <LoaderCircleIcon className="animate-spin" />
              Finishing Google sign-in...
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Separator className="flex-1 bg-white/10" />
          <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/35">
            or
          </span>
          <Separator className="flex-1 bg-white/10" />
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${mode}-email`} className="text-white/75">
              Email
            </Label>
            <div className="auth-input-wrap">
              <MailIcon className="auth-input-icon" />
              <Input
                id={`${mode}-email`}
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="auth-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <Label htmlFor={`${mode}-password`} className="text-white/75">
                Password
              </Label>
            </div>
            <div className="auth-input-wrap">
              <LockKeyholeIcon className="auth-input-icon" />
              <Input
                id={`${mode}-password`}
                type="password"
                placeholder={isSignup ? "At least 6 characters" : ""}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="auth-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="auth-submit-button"
            disabled={isPending || isGooglePending}
          >
            {isPending ? "Loading..." : isSignup ? "Sign up" : "Login"}
          </Button>
        </form>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-white/55">
        <span>{isSignup ? "Have an account?" : "Don't have an account?"}</span>
        <Button variant="ghost" asChild className="h-auto px-1 py-0 text-white hover:bg-transparent hover:text-white">
          <Link href={alternateHref}>
            {isSignup ? "Sign in" : "Sign up"}
          </Link>
        </Button>
      </div>
    </section>
  )
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0">
      <path
        d="M21.8 12.23c0-.77-.07-1.5-.2-2.2H12v4.16h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.6Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.92 6.77-2.49l-3.3-2.56c-.92.62-2.08.98-3.47.98-2.66 0-4.92-1.8-5.73-4.22H2.86v2.64A10.22 10.22 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.27 13.7A6.14 6.14 0 0 1 5.95 12c0-.6.11-1.18.32-1.7V7.66H2.86A10.22 10.22 0 0 0 1.8 12c0 1.63.39 3.18 1.06 4.34l3.41-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.07c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.07 3.04 14.76 2 12 2 7.95 2 4.45 4.32 2.86 7.66l3.41 2.64C7.08 7.87 9.34 6.07 12 6.07Z"
        fill="#EA4335"
      />
    </svg>
  )
}
