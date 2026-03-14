"use client"

import Link from "next/link"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { AlertCircleIcon, LoaderCircleIcon, SparklesIcon } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type AuthMode = "login" | "signup"

interface AuthFormProps {
  mode: AuthMode
  nextPath?: string
}

interface GoogleCredentialResponse {
  credential?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
            use_fedcm_for_prompt?: boolean
            context?: "signin" | "signup" | "use"
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon"
              theme?: "outline" | "filled_blue" | "filled_black"
              size?: "large" | "medium" | "small"
              text?:
                | "signin_with"
                | "signup_with"
                | "continue_with"
                | "signin"
                | "signup"
                | "continue"
              shape?: "rectangular" | "pill" | "circle" | "square"
              width?: number
              logo_alignment?: "left" | "center"
            }
          ) => void
        }
      }
    }
  }
}

export function AuthForm({ mode, nextPath = "/dashboard" }: AuthFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isGooglePending, setIsGooglePending] = useState(false)
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false)
  const [googleButtonWidth, setGoogleButtonWidth] = useState(0)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const isSignup = mode === "signup"
  const title = isSignup ? "Create your palace" : "Welcome back"
  const description = isSignup
    ? "Start turning your study material into a guided memory world."
    : "Pick up your learning palaces right where you left off."

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

  const handleGoogleCredential = useEffectEvent(async (credentialResponse: GoogleCredentialResponse) => {
    setError(null)
    setMessage(null)
    setIsGooglePending(true)

    try {
      if (!credentialResponse.credential) {
        throw new Error("Google did not return an ID token.")
      }

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credentialResponse.credential,
      })

      if (signInError) {
        throw signInError
      }

      router.replace(nextPath)
      router.refresh()
    } catch (oauthFailure) {
      const messageText =
        oauthFailure instanceof Error ? oauthFailure.message : "Google sign-in failed."
      setError(messageText)
    } finally {
      setIsGooglePending(false)
    }
  })

  useEffect(() => {
    if (!googleButtonRef.current) {
      return
    }

    const updateWidth = () => {
      const nextWidth = Math.floor(googleButtonRef.current?.clientWidth ?? 0)
      if (nextWidth > 0) {
        setGoogleButtonWidth(nextWidth)
      }
    }

    updateWidth()

    const observer = new ResizeObserver(() => {
      updateWidth()
    })

    observer.observe(googleButtonRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (window.google?.accounts.id) {
      setIsGoogleScriptLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (
      !isGoogleScriptLoaded ||
      !googleClientId ||
      !googleButtonRef.current ||
      !window.google?.accounts.id ||
      googleButtonWidth <= 0
    ) {
      return
    }

    googleButtonRef.current.innerHTML = ""

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      use_fedcm_for_prompt: true,
      context: isSignup ? "signup" : "signin",
    })

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: isSignup ? "signup_with" : "signin_with",
      shape: "pill",
      width: googleButtonWidth,
      logo_alignment: "left",
    })
  }, [googleButtonWidth, googleClientId, isGoogleScriptLoaded, isSignup])

  return (
    <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          setIsGoogleScriptLoaded(true)
        }}
        onReady={() => {
          setIsGoogleScriptLoaded(true)
        }}
      />

      <CardHeader className="gap-3">
        <CardTitle className="font-[family-name:var(--font-baloo)] text-3xl">
          {title}
        </CardTitle>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>There was a problem</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {message ? (
            <Alert>
              <SparklesIcon />
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="w-full space-y-2">
            <div
              ref={googleButtonRef}
              className="w-full min-h-11 rounded-2xl [&>div]:!w-full [&_iframe]:!w-full"
            />
            {isGooglePending ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon className="animate-spin" />
                Finishing Google sign-in...
              </div>
            ) : null}
            {!googleClientId ? (
              <p className="text-sm text-muted-foreground">
                Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to render the official Google sign-in button.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Or with email
            </span>
            <Separator className="flex-1" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${mode}-email`}>Email</Label>
              <Input
                id={`${mode}-email`}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`${mode}-password`}>Password</Label>
              <Input
                id={`${mode}-password`}
                type="password"
                placeholder="At least 6 characters"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-2 h-11 w-full rounded-2xl"
              disabled={isPending || isGooglePending}
            >
              {isPending ? "Loading..." : isSignup ? "Create account" : "Log in"}
            </Button>
          </form>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "Need an account?"}
        </span>
        <Button
          variant="ghost"
          render={<Link href={isSignup ? "/login" : "/signup"} />}
          nativeButton={false}
        >
          {isSignup ? "Log in" : "Sign up"}
        </Button>
      </CardFooter>
    </Card>
  )
}
