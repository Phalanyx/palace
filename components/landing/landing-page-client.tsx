"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { User } from "@supabase/supabase-js"
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CompassIcon,
  Layers3Icon,
  LoaderCircleIcon,
  PaperclipIcon,
  SparklesIcon,
} from "lucide-react"

import DragonSceneStaticLoader from "@/components/dragon-scene-static-loader"
import { MarketingHeader } from "@/components/marketing-header"
import { Button } from "@/components/ui/button"
import { clearLandingDraft, saveLandingDraft } from "@/lib/landing-draft"

const landingSteps = [
  {
    title: "Start with one idea",
    description: "Drop in a topic, a lecture, or a rough goal and let Palace turn it into a spatial memory path.",
    icon: CompassIcon,
  },
  {
    title: "Get a structure back",
    description: "The system shapes scenes, rooms, and cues you can revisit instead of rereading flat notes.",
    icon: Layers3Icon,
  },
  {
    title: "Walk it in the dashboard",
    description: "Refine, revisit, and test recall inside a dedicated workspace once your palace is generated.",
    icon: BookOpenTextIcon,
  },
] as const

export function LandingPageClient({ user }: { user: User | null }) {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt || isSubmitting) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    if (!user) {
      try {
        await saveLandingDraft(trimmedPrompt, attachedFiles)
      } catch {
        setError("Could not save your prompt and attachments before login.")
        setIsSubmitting(false)
        return
      }

      router.push(`/login?next=${encodeURIComponent("/dashboard?intent=create-palace")}`)
      return
    }

    try {
      const formData = new FormData()
      formData.append("prompt", trimmedPrompt)
      attachedFiles.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/palaces/generate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "Failed to create your memory palace.")
      }

      await clearLandingDraft()
      router.push("/dashboard")
      router.refresh()
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to create your memory palace."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="landing-shell">
      <div className="landing-scene">
        <DragonSceneStaticLoader />
      </div>
      <div className="landing-overlay" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <MarketingHeader user={user} />

        <main className="flex-1">
          <section className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-7xl flex-col justify-center px-4 pb-20 pt-16 sm:px-6 lg:px-8">
            <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
              <div className="max-w-3xl">
                <div className="landing-kicker">
                  <SparklesIcon className="size-4" />
                  Memory palaces for actual recall
                </div>
                <h1 className="landing-title">
                  Think it once. Walk it later.
                </h1>
                <p className="landing-copy">
                  Palace turns material into scenes, rooms, and retrieval paths you can mentally
                  revisit. Try a topic below, then move into the dashboard to build and train it.
                </p>

                <div className="landing-actions">
                  <Button asChild className="rounded-full px-5">
                    <Link href={user ? "/dashboard" : "/signup"}>
                      {user ? "Go to dashboard" : "Start building"}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                  {!user ? (
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full border-white/14 bg-white/6 px-5 text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link href="/login">Log in</Link>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="landing-hero-card">
                <div className="landing-hero-copy">
                  <span className="landing-hero-label">Try the flow</span>
                  <h2>Describe a topic and Palace will scaffold the first memory route.</h2>
                </div>

                <div className="landing-composer">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe the memory palace you want to build..."
                    className="landing-composer-input"
                  />

                  <div className="landing-composer-footer">
                    <div className="landing-composer-meta">
                      <label className="landing-attachment-pill">
                        <PaperclipIcon className="size-4" />
                        <span>
                          {attachedFiles.length > 0
                            ? `${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} attached`
                            : "add an attachment (.pdf, .txt, .md)"}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.txt,.md"
                          className="hidden"
                          onChange={(event) =>
                            setAttachedFiles(event.target.files ? Array.from(event.target.files) : [])
                          }
                        />
                      </label>

                      <p className="landing-composer-hint">
                        {user
                          ? "Signed in: submit now and jump straight into the dashboard."
                          : "Signed out: we’ll save this prompt and attachments, ask you to log in, then continue automatically."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!prompt.trim() || isSubmitting}
                      className="landing-composer-button rounded-full px-5"
                    >
                      {isSubmitting ? (
                        <>
                          <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                          Building
                        </>
                      ) : (
                        <>
                          Create palace
                          <ArrowRightIcon data-icon="inline-end" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {error ? <p className="landing-error">{error}</p> : null}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="landing-section-shell">
              <div className="landing-section-heading">
                <span className="landing-section-kicker">How it works</span>
                <h2>One public landing flow, one real dashboard workspace.</h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {landingSteps.map(({ title, description, icon: Icon }) => (
                  <article key={title} className="landing-step-card">
                    <div className="landing-step-icon">
                      <Icon className="size-5" />
                    </div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="highlights" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="landing-split-panel">
              <div>
                <span className="landing-section-kicker">Why this structure</span>
                <h2 className="landing-panel-title">Landing stays public. Creation becomes a guided handoff.</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="landing-stat-card">
                  <span className="landing-stat-value">Public</span>
                  <p>Visitors can understand the product and try a prompt before they commit to auth.</p>
                </div>
                <div className="landing-stat-card">
                  <span className="landing-stat-value">Protected</span>
                  <p>The dashboard remains the focused workspace where users return to generated palaces.</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <span className="landing-footer-brand">Palace</span>
              <p className="landing-footer-copy">Build memorable learning worlds with a cleaner auth and dashboard flow.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-white/60">
              <span className="landing-footer-pill">Dragon landing</span>
              <span className="landing-footer-pill">Supabase auth</span>
              <span className="landing-footer-pill">Prompt to palace</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
