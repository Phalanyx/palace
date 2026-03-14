"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { RotateCw, Trash2, ArrowRight, Lock, ArrowUp, Search, Paperclip, Home, FolderOpen, BookOpen } from "lucide-react"
import Link from "next/link"
import { User } from "@supabase/supabase-js"
import { Avatar, AvatarFallback } from "@/components/ui/glass/avatar"
import DragonSceneLoader from "@/components/dragon-scene-loader"
import { UserDropdown } from "@/components/user-dropdown"
import { clearLandingDraft, loadLandingDraft } from "@/lib/landing-draft"

interface Palace {
  id: string
  title: string
  prompt: string
  status: string
  _count?: { rooms: number }
  testSessions?: { scorePct: number | null }[]
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ready') return (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
      Operational
    </div>
  )
  if (status === 'processing') return (
    <div className="flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-200">
      <RotateCw className="h-3 w-3 animate-spin" />
      Drafting Space
    </div>
  )
  if (status === 'error') return (
    <div className="flex items-center gap-1.5 rounded-full border border-rose-400/35 bg-rose-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-200">
      <span className="flex h-3 w-3 items-center justify-center rounded-full border border-rose-300 text-[8px] font-black">!</span>
      Structural Error
    </div>
  )
  return null
}

function RetentionRing({ pct }: { pct: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="color-mix(in srgb, var(--dashboard-text-soft) 18%, transparent)" strokeWidth="3.5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--glass-accent)" strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

function RoomBlocks({ count }: { count: number }) {
  return (
    <div className="glass-text-soft flex items-center gap-2 text-xs font-mono">
      <span>Rooms: {String(count).padStart(2, '0')}</span>
      <div className="flex gap-0.5">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-2 w-2 ${i < Math.min(count, 4) ? 'bg-primary' : 'border border-border'}`} />
        ))}
      </div>
    </div>
  )
}

function PalaceCard({ palace }: { palace: Palace }) {
  const score = palace.testSessions?.[0]?.scorePct
  const rooms = palace._count?.rooms ?? 0
  const isError = palace.status === 'error'
  const isProcessing = palace.status === 'processing'
  const stabilityLabel = score === undefined ? null
    : score >= 70 ? 'High Stability'
    : score >= 40 ? 'Moderate Stability'
    : 'Low Stability'

  return (
    <div className="glass-panel glass-interactive flex flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <StatusBadge status={palace.status} />
        <RoomBlocks count={rooms} />
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col">
        <h3 className="mt-2 mb-1 text-lg leading-snug font-bold text-foreground">{palace.title}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{palace.prompt}</p>
        <div className="my-4 border-t border-dashed border-border/80" />
        {isError ? (
          <div className="flex items-center justify-between">
            <Link href={`/palace/${palace.id}`} className="glass-accent text-sm font-mono transition-colors hover:text-foreground">
              Repair Architecture
            </Link>
            <button className="glass-text-soft transition-colors hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {score !== undefined && <RetentionRing pct={score} />}
              <div>
                <div className="glass-text-soft mb-0.5 text-[9px] font-bold tracking-widest uppercase">Retention</div>
                <div className="glass-text-muted text-sm font-medium">Loading...</div>
              </div>
            </div>
            <Lock className="glass-text-soft h-4 w-4" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {score !== undefined ? (
                <>
                  <RetentionRing pct={score} />
                  <div>
                    <div className="glass-text-soft mb-0.5 text-[9px] font-bold tracking-widest uppercase">Retention</div>
                    <div className="text-sm font-semibold text-foreground">{stabilityLabel}</div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="glass-text-soft mb-0.5 text-[9px] font-bold tracking-widest uppercase">Retention</div>
                  <div className="glass-text-soft text-sm">Not tested yet</div>
                </div>
              )}
            </div>
            <Link href={`/palace/${palace.id}`} className="glass-pill glass-interactive glass-text-muted flex h-8 w-8 items-center justify-center rounded-full hover:text-foreground">
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

const PROMPTS = [
  { title: "The Grand Library", desc: "Classic wood-paneled halls for literature and philosophy.", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
  { title: "Neo-Tokyo Grid", desc: "Cyberpunk neon landmarks for technology and coding.", img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80" },
  { title: "Quantum Void", desc: "Infinite cosmic vacuum for abstract physics concepts.", img: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&q=80" },
  { title: "Bauhaus Pavilion", desc: "Minimal geometric volumes for systematic logic.", img: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&q=80" },
]

const FILTER_TABS = ["ALL", "STYLE", "THEME", "STRUCTURE", "LEARNING METHOD"]
const NAV_TABS = [
  { value: "home", label: "Home", icon: Home },
  { value: "projects", label: "Projects", icon: FolderOpen },
  { value: "prompt-library", label: "Prompt Library", icon: BookOpen },
]

function DashboardHeader({
  activeNavTab,
  onNavChange,
  user,
}: {
  activeNavTab: string
  onNavChange: (value: string) => void
  user: User | null
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[color:color-mix(in_srgb,var(--dashboard-surface-strong)_92%,transparent)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/palace_logo.png" alt="Palace" className="h-14 w-auto sm:h-16" />
        </div>

        <nav
          aria-label="Dashboard navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_TABS.map(({ value, label, icon: Icon }) => {
            const isActive = value === activeNavTab

            return (
              <button
                key={value}
                type="button"
                onClick={() => onNavChange(value)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "dashboard-accent-pill text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "dashboard-text-soft hover:bg-[color:color-mix(in_srgb,var(--dashboard-surface)_72%,transparent)] hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <div className="dashboard-text-soft text-[10px] font-semibold uppercase tracking-[0.28em]">
              Dashboard
            </div>
            <div className="dashboard-text-muted text-sm">
              Memory Palace Workspace
            </div>
          </div>
          {user ? (
            <UserDropdown user={user} />
          ) : (
            <Avatar size="md" glow className="ring-1 ring-border">
              <AvatarFallback className="bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--dashboard-accent)_35%,white),color-mix(in_srgb,var(--dashboard-surface-strong)_92%,black))] font-semibold text-foreground">
                ?
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-2 px-4 pb-3 md:hidden sm:px-6 lg:px-8">
        {NAV_TABS.map(({ value, label, icon: Icon }) => {
          const isActive = value === activeNavTab

          return (
            <button
              key={value}
              type="button"
              onClick={() => onNavChange(value)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                isActive
                  ? "dashboard-accent-pill text-foreground"
                  : "dashboard-surface dashboard-text-soft",
              ].join(" ")}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
export default function DashboardClient({ initialPalaces, user }: { initialPalaces: Palace[], user: User | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [palaces, setPalaces] = useState(initialPalaces)
  const [inputText, setInputText] = useState("")
  const [activeNavTab, setActiveNavTab] = useState("home")
  const [activeFilter, setActiveFilter] = useState("ALL")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const hasHandledLandingIntent = useRef(false)

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    root.classList.add("dark")
    body.classList.add("dark")

    return () => {
      root.classList.remove("dark")
      body.classList.remove("dark")
    }
  }, [])

  async function generatePalace(prompt: string, files: File[] = []) {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt || isGenerating) {
      return false
    }

    setIsGenerating(true)
    setGenerateError(null)

    try {
      const formData = new FormData()
      formData.append('prompt', trimmedPrompt)
      files.forEach(f => formData.append('files', f))
      const res = await fetch('/api/palaces/generate', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { error?: string } | null
        setGenerateError(err?.error ?? 'Something went wrong')
        return false
      }
      const data = await res.json()
      setPalaces(prev => [{
        id: data.palaceId,
        title: data.title,
        prompt: data.prompt,
        status: 'processing',
        _count: { rooms: 0 },
        testSessions: [],
      }, ...prev])
      return true
    } catch {
      setGenerateError('Network error — please try again')
      return false
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerate() {
    const created = await generatePalace(inputText, attachedFiles)

    if (created) {
      setInputText("")
      setAttachedFiles([])
    }
  }

  useEffect(() => {
    if (!user || hasHandledLandingIntent.current) {
      return
    }

    if (searchParams.get("intent") !== "create-palace") {
      return
    }

    hasHandledLandingIntent.current = true

    void (async () => {
      const draft = await loadLandingDraft()

      if (!draft?.prompt.trim()) {
        router.replace("/dashboard")
        return
      }

      setInputText(draft.prompt)
      setAttachedFiles(draft.files)

      const created = await generatePalace(draft.prompt, draft.files)

      if (created) {
        await clearLandingDraft()
        setInputText("")
        setAttachedFiles([])
      }

      router.replace("/dashboard")
    })()
  }, [router, searchParams, user])

  return (
    <div className="dark glass-page min-h-screen font-sans text-foreground">
        <DashboardHeader
          activeNavTab={activeNavTab}
          onNavChange={setActiveNavTab}
          user={user}
        />

      {/* Hero with dragon scene background */}
      <div className="relative overflow-hidden" style={{ minHeight: 980 }}>
        {/* Dragon scene fills the hero */}
        <div className="absolute inset-0 bg-background">
          <DragonSceneLoader />
        </div>
        {/* Vignette on all 4 edges */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 40%, var(--glass-page-bg) 100%)" }} />
        {/* Extra fade at bottom to blend into page */}
        <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: "linear-gradient(to top, var(--glass-page-bg), transparent)" }} />

        {/* Hero content */}
        <div className="relative z-10 flex min-h-[980px] flex-col items-center justify-center px-6 pb-16 pt-20">
          <h1 className="mb-3 text-center text-6xl leading-tight font-black tracking-tight text-foreground drop-shadow-lg">
            Think it. Explore it.
          </h1>
          <p className="mb-10 text-center text-lg text-muted-foreground drop-shadow">
            Explore freely, iterate fast. Your learning, AI-powered.
          </p>

          {/* Input box */}
          <div className="dashboard-panel mb-5 w-full max-w-3xl overflow-hidden rounded-[30px] backdrop-blur-[32px]">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Describe the palace you want to create..."
              className="min-h-[130px] w-full resize-none bg-transparent px-6 pt-6 pb-4 text-base text-foreground outline-none placeholder:text-[color:var(--dashboard-text-soft)]"
            />
            <div className="flex items-center justify-between border-t border-border bg-[color:color-mix(in_srgb,var(--dashboard-surface-alt)_72%,transparent)] px-5 pb-5 pt-4">
              <div className="flex items-center gap-3">
                <label className="dashboard-pill flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-xs transition-colors hover:text-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span>
                    {attachedFiles.length > 0
                      ? `${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''} attached`
                      : 'add an attachment (.pdf, .txt, and .md)'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.pdf,.md"
                    className="hidden"
                    onChange={e => setAttachedFiles(e.target.files ? Array.from(e.target.files) : [])}
                  />
                </label>
              </div>
              <button
                onClick={handleGenerate}
                className="flex h-12 items-center gap-2 rounded-full border border-primary/35 bg-primary/18 px-5 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-primary/24 disabled:opacity-30"
                disabled={!inputText.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Building...
                  </>
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Inline error */}
          {generateError && (
            <p className="text-red-400 text-sm mb-3 -mt-2">{generateError}</p>
          )}

          {/* Quick action pills */}
          <div className="flex items-center justify-center gap-3">
            {["Recreate Screenshot", "Import from Site", "Explore Effects"].map(label => (
              <button
                key={label}
                className="dashboard-pill rounded-full px-4 py-2 text-sm backdrop-blur-xl transition-colors hover:text-foreground"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Palaces */}
      <section className="mx-auto mb-16 max-w-7xl px-6 pt-12">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="dashboard-heading-kicker mb-2 text-[11px] font-semibold uppercase tracking-[0.28em]">
              Workspace
            </p>
            <h2 className="text-3xl font-bold text-foreground">Recent Palaces</h2>
          </div>
          <p className="dashboard-text-muted hidden max-w-md text-right text-sm lg:block">
            Track your latest builds, revisit unstable memory spaces, and continue training where recall is weakest.
          </p>
        </div>
        {palaces.length === 0 ? (
          <div className="dashboard-panel dashboard-text-muted rounded-[28px] py-16 text-center">
            No palaces yet — describe one above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {palaces.map(p => <PalaceCard key={p.id} palace={p} />)}
          </div>
        )}
      </section>

      {/* Discover Prompts */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="dashboard-panel rounded-[32px] px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="dashboard-heading-kicker mb-2 text-[11px] font-semibold uppercase tracking-[0.28em]">
              Inspiration
            </p>
            <h2 className="text-2xl font-black tracking-widest uppercase text-foreground">Discover Palace Prompts</h2>
          </div>
          <div className="dashboard-pill flex w-72 items-center gap-2 rounded-full px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Search className="dashboard-text-soft h-4 w-4" />
            <input placeholder="Search prompts..." className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[color:var(--dashboard-text-soft)]" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`rounded-full border px-4 py-2 text-sm font-bold tracking-wider transition-colors ${
                activeFilter === tab
                  ? "dashboard-accent-pill shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "dashboard-pill"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PROMPTS.map(p => (
            <div
              key={p.title}
              className="dashboard-panel group overflow-hidden rounded-[26px] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={p.title} className="h-full w-full object-cover opacity-58 transition-opacity group-hover:opacity-72" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/36 to-transparent" />
              </div>
              <div className="p-4">
                <div className="mb-1 text-sm font-black tracking-wider uppercase text-foreground">{p.title}</div>
                <div className="dashboard-text-soft mb-4 text-[10px] font-bold uppercase leading-relaxed tracking-widest">{p.desc}</div>
                <button
                  onClick={() => { setInputText(`Create a palace inspired by: ${p.title}. ${p.desc}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="dashboard-pill flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium hover:border-primary/35"
                >
                  + Use Prompt
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      <footer className="border-t border-border bg-[color:color-mix(in_srgb,var(--dashboard-surface-strong)_96%,transparent)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="dashboard-heading-kicker text-[11px] font-semibold uppercase tracking-[0.28em]">
              Palace
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Build better memory spaces.</h3>
            <p className="dashboard-text-muted mt-2 max-w-md text-sm">
              Create, test, and refine memory palaces with a darker workspace tuned for focus and recall.
            </p>
          </div>

          <div className="dashboard-text-muted flex flex-wrap items-center gap-3 text-sm">
            <span className="dashboard-pill rounded-full px-3 py-1.5">
              AI workspace
            </span>
            <span className="dashboard-pill rounded-full px-3 py-1.5">
              Recall training
            </span>
            <span className="dashboard-pill rounded-full px-3 py-1.5">
              Supabase-backed
            </span>
          </div>
        </div>
      </footer>

      {showCreateModal && (
        <CreatePalaceModal
          initialPrompt={inputText}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newPalace) => {
            setPalaces([newPalace, ...palaces])
            setShowCreateModal(false)
            setInputText("")
          }}
        />
      )}
    </div>
  )
}

function CreatePalaceModal({ initialPrompt, onClose, onSuccess }: {
  initialPrompt: string
  onClose: () => void
  onSuccess: (p: Palace) => void
}) {
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState(initialPrompt)
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !prompt || files.length === 0) return
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append("title", title)
    formData.append("prompt", prompt)
    files.forEach(f => formData.append("files", f))
    try {
      const res = await fetch("/api/palaces", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        onSuccess({ id: data.palaceId, title, prompt, status: 'processing', _count: { rooms: 0 } })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel-strong relative w-full max-w-lg rounded-2xl p-6">
        <h2 className="mb-5 text-xl font-black tracking-wide text-foreground">Create Palace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="glass-text-soft mb-1.5 block text-xs font-bold tracking-widest uppercase">Title</label>
            <input
              required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. History of Rome"
              className="glass-panel w-full rounded-xl px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </div>
          <div>
            <label className="glass-text-soft mb-1.5 block text-xs font-bold tracking-widest uppercase">Prompt</label>
            <textarea
              required value={prompt} onChange={e => setPrompt(e.target.value)}
              className="glass-panel h-24 w-full resize-none rounded-xl px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </div>
          <div>
            <label className="glass-text-soft mb-1.5 block text-xs font-bold tracking-widest uppercase">Source Documents</label>
            <label className="glass-panel glass-interactive flex cursor-pointer flex-col items-center justify-center rounded-xl border-dashed p-6 text-center">
              <input required type="file" multiple accept=".txt,.pdf,.pptx" onChange={e => e.target.files && setFiles(Array.from(e.target.files))} className="hidden" />
              <span className="glass-text-soft text-sm">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload .txt / .pdf / .pptx'}</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !title || !prompt || files.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
          >
            {isSubmitting ? <><RotateCw className="w-4 h-4 animate-spin" />Generating...</> : 'Generate Palace'}
          </button>
        </form>
      </div>
    </div>
  )
}
