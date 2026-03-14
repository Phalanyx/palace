"use client"

import { useState, useTransition } from "react"
import { RotateCw, Trash2, ArrowRight, Lock, ArrowUp, Search, Paperclip, Home, FolderOpen, BookOpen, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/glass/avatar"
import {
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/glass/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/glass/tabs"
import DragonSceneLoader from "../components/DragonSceneLoader"

// ─── Color palette (warm zinc + blue, Notion/Arc-inspired) ───────────────────
// bg:          #f7f7f5  warm off-white
// card:        #ffffff  white
// nav:         #ffffff  white with border #e4e4e0
// border:      #e4e4e0  zinc-ish warm gray
// hover-border:#d4d4d0  slightly darker
// text-primary:#18181b  zinc-900
// text-muted:  #71717a  zinc-500
// text-dim:    #a1a1aa  zinc-400
// accent:      #2563eb  blue-600
// accent-hover:#1d4ed8  blue-700

interface Palace {
  id: string
  title: string
  prompt: string
  status: string
  _count?: { rooms: number }
  testSessions?: { scorePct: number }[]
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ready') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f0fdf4] border border-[#86efac] text-[#16a34a] text-[10px] font-bold tracking-widest uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
      Operational
    </div>
  )
  if (status === 'processing') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eff6ff] border border-[#93c5fd] text-[#2563eb] text-[10px] font-bold tracking-widest uppercase">
      <RotateCw className="w-3 h-3 animate-spin" />
      Drafting Space
    </div>
  )
  if (status === 'error') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] text-[10px] font-bold tracking-widest uppercase">
      <span className="w-3 h-3 flex items-center justify-center rounded-full border border-[#dc2626] text-[8px] font-black">!</span>
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
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
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

function AvatarMenu({ initials, email }: { initials: string, email: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const displayName = email?.split("@")[0]?.replace(/[._-]+/g, " ") || "Palace user"

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace("/")
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Open profile menu"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        }
      >
        <Avatar size="md" glow>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={12} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <p className="glass-text-soft">Profile</p>
            <p className="truncate text-foreground">{displayName}</p>
            {email ? (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem disabled={isPending} onClick={handleSignOut}>
            <LogOut />
            {isPending ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getInitials(email: string | null) {
  if (!email) return "?"
  const local = email.split("@")[0]
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export default function DashboardClient({ initialPalaces, userEmail }: { initialPalaces: Palace[], userEmail: string | null }) {
  const [palaces, setPalaces] = useState(initialPalaces)
  const [inputText, setInputText] = useState("")
  const [activeNavTab, setActiveNavTab] = useState("home")
  const [activeFilter, setActiveFilter] = useState("ALL")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  async function handleGenerate() {
    if (!inputText.trim() || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const formData = new FormData()
      formData.append('prompt', inputText)
      attachedFiles.forEach(f => formData.append('files', f))
      const res = await fetch('/api/palaces/generate', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        setGenerateError(err.error ?? 'Something went wrong')
        return
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
      setInputText("")
      setAttachedFiles([])
    } catch {
      setGenerateError('Network error — please try again')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="dark glass-page min-h-screen font-sans text-foreground">
      {/* Nav */}
      <nav className="glass-panel flex items-center justify-between px-6 py-4 absolute top-0 inset-x-0 z-20">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/palace_logo.png" alt="Palace" className="h-20 w-auto" />
        </div>
        <Tabs value={activeNavTab} onValueChange={setActiveNavTab}>
          <TabsList>
            {NAV_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}>
                <Icon data-icon="inline-start" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <AvatarMenu initials={getInitials(userEmail)} email={userEmail} />
      </nav>

      {/* Hero with dragon scene background */}
      <div className="relative overflow-hidden" style={{ height: 1050 }}>
        {/* Dragon scene fills the hero */}
        <div className="absolute inset-0 bg-background">
          <DragonSceneLoader />
        </div>
        {/* Vignette on all 4 edges */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 40%, var(--glass-page-bg) 100%)" }} />
        {/* Extra fade at bottom to blend into page */}
        <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: "linear-gradient(to top, var(--glass-page-bg), transparent)" }} />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 pb-8 pt-16">
          <h1 className="mb-3 text-center text-6xl leading-tight font-black tracking-tight text-foreground drop-shadow-lg">
            Think it. Explore it.
          </h1>
          <p className="mb-10 text-center text-lg text-muted-foreground drop-shadow">
            Explore freely, iterate fast. Your learning, AI-powered.
          </p>

          {/* Input box */}
          <div className="glass-panel-strong mb-5 w-full max-w-2xl overflow-hidden rounded-2xl">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Describe the palace you want to create..."
              className="min-h-[100px] w-full resize-none bg-transparent px-5 pt-5 pb-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                  <Paperclip className="w-4 h-4" />
                  <span className="text-xs">
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
                className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
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
              <button key={label} className="glass-pill glass-interactive rounded-full px-4 py-2 text-sm text-foreground">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Palaces */}
      <div className="max-w-7xl mx-auto px-6 mb-16 pt-10">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Recent Palaces</h2>
        {palaces.length === 0 ? (
          <div className="glass-panel text-center rounded-2xl border-dashed py-16 text-muted-foreground">
            No palaces yet — describe one above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {palaces.map(p => <PalaceCard key={p.id} palace={p} />)}
          </div>
        )}
      </div>

      {/* Discover Prompts */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black tracking-widest uppercase text-foreground">Discover Palace Prompts</h2>
          <div className="glass-pill flex w-64 items-center gap-2 rounded-full px-4 py-2">
            <Search className="glass-text-soft h-4 w-4" />
            <input placeholder="Search prompts..." className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`rounded-full px-4 py-2 text-sm font-bold tracking-wider transition-colors ${activeFilter === tab ? 'bg-background text-foreground shadow-sm' : 'glass-pill glass-interactive text-muted-foreground hover:text-foreground'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PROMPTS.map(p => (
            <div key={p.title} className="glass-panel glass-interactive group overflow-hidden rounded-2xl">
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={p.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity" />
              </div>
              <div className="p-4">
                <div className="mb-1 text-sm font-black tracking-wider uppercase text-foreground">{p.title}</div>
                <div className="glass-text-soft mb-4 text-[10px] leading-relaxed font-bold tracking-widest uppercase">{p.desc}</div>
                <button
                  onClick={() => { setInputText(`Create a palace inspired by: ${p.title}. ${p.desc}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="glass-pill glass-interactive flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-foreground"
                >
                  + Use Prompt
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
