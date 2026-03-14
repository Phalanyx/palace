"use client"

import { useState, useRef, useEffect } from "react"
import { RotateCw, Trash2, ArrowRight, Lock, ArrowUp, Search, Paperclip, Home, FolderOpen, BookOpen, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import DragonSceneLoader from "../components/DragonSceneLoader"
import { PROMPT_LIBRARY, PROMPT_CATEGORIES } from "@/lib/promptLibrary"

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
  coverImageUrl?: string | null
  _count?: { rooms: number }
  testSessions?: { scorePct: number | null }[]
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
        <circle cx="24" cy="24" r={r} fill="none" stroke="#60a5fa" strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

function RoomBlocks({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 text-white/30 text-[10px] font-medium tracking-wide uppercase">
      <span>{count} {count === 1 ? 'room' : 'rooms'}</span>
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.min(count, 4) ? 'bg-white/50' : 'bg-white/10'}`} />
        ))}
      </div>
    </div>
  )
}

function PalaceCard({ palace }: { palace: Palace }) {
  const score = palace.testSessions?.[0]?.scorePct ?? undefined
  const rooms = palace._count?.rooms ?? 0
  const isError = palace.status === 'error'
  const isProcessing = palace.status === 'processing'
  const stabilityLabel = score === undefined ? null
    : score >= 70 ? 'High Stability'
    : score >= 40 ? 'Moderate Stability'
    : 'Low Stability'

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl overflow-hidden flex flex-col hover:border-white/30 hover:bg-white/15 transition-all shadow-lg shadow-black/20">
      {/* Cover image */}
      <div className="relative h-36 w-full overflow-hidden bg-white/5">
        {palace.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={palace.coverImageUrl} alt={palace.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <RotateCw className="w-5 h-5 text-white/20 animate-spin" />
          </div>
        )}
        {/* Status badge overlaid on image */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={palace.status} />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div />
        <RoomBlocks count={rooms} />
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-white mt-2 mb-1 leading-snug">{palace.title}</h3>
        <p className="text-white/50 text-sm line-clamp-3 leading-relaxed flex-1">{palace.prompt}</p>
        <div className="border-t border-dashed border-white/10 my-4" />
        {isError ? (
          <div className="flex items-center justify-between">
            <Link href={`/palace/${palace.id}`} className="text-[#60a5fa] text-sm font-mono hover:text-white transition-colors">
              Repair Architecture
            </Link>
            <button className="text-white/20 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-white/20" />
              <span className="text-white/40 text-sm">Building...</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {score !== undefined ? (
              <div className="flex items-center gap-3">
                <RetentionRing pct={score} />
                <div>
                  <div className="text-white/30 text-[9px] font-bold tracking-widest uppercase mb-0.5">Retention</div>
                  <div className="text-white text-sm font-semibold">{stabilityLabel}</div>
                </div>
              </div>
            ) : (
              <div />
            )}
            <Link href={`/palace/${palace.id}`} className="w-8 h-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

const FILTER_TABS = ["All", ...PROMPT_CATEGORIES] as const

function AvatarMenu({ initials, email }: { initials: string, email: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/")
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-white hover:bg-white/30 transition-colors"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-3 shadow-2xl z-50">
          {email && (
            <div className="px-2 py-1.5 mb-2">
              <p className="text-white/40 text-xs truncate">{email}</p>
            </div>
          )}
          <div className="h-px bg-white/10 mb-2" />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
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
  const [activeFilter, setActiveFilter] = useState("All")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null)
  const recentPalacesRef = useRef<HTMLHeadingElement>(null)
  const promptLibraryRef = useRef<HTMLHeadingElement>(null)

  const filteredPrompts = PROMPT_LIBRARY.filter(p => {
    const matchesCategory = activeFilter === "All" || p.category === activeFilter
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  async function generatePalace(promptText: string, files: File[] = []) {
    setGenerateError(null)
    try {
      const formData = new FormData()
      formData.append('prompt', promptText)
      files.forEach(f => formData.append('files', f))
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
        coverImageUrl: null,
        _count: { rooms: 0 },
        testSessions: [],
      }, ...prev])
      setTimeout(() => {
        recentPalacesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch {
      setGenerateError('Network error — please try again')
    }
  }

  async function handleGenerate() {
    if (!inputText.trim() || isGenerating) return
    setIsGenerating(true)
    try {
      await generatePalace(inputText, attachedFiles)
      setInputText("")
      setAttachedFiles([])
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleUsePrompt(p: typeof PROMPT_LIBRARY[number]) {
    if (generatingPromptId) return
    setGeneratingPromptId(p.id)
    try {
      await generatePalace(p.prompt)
    } finally {
      setGeneratingPromptId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d10] text-white font-sans">
      {/* Nav */}
      <nav className="grid grid-cols-3 items-center px-6 py-4 absolute top-0 inset-x-0 z-20">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/palace_logo.png" alt="Palace" className="h-20 w-auto mt-2" />
        </div>
        <div className="flex items-center justify-self-center bg-white/10 border border-white/20 rounded-full px-1 py-1 gap-1 backdrop-blur-sm">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-white/20 text-white shadow-sm">
            <Home className="w-3.5 h-3.5" />Home
          </button>
          <button onClick={() => recentPalacesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors text-white/60 hover:text-white">
            <FolderOpen className="w-3.5 h-3.5" />Projects
          </button>
          <button onClick={() => promptLibraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors text-white/60 hover:text-white">
            <BookOpen className="w-3.5 h-3.5" />Prompt Library
          </button>
        </div>
        <div className="justify-self-end">
          <AvatarMenu initials={getInitials(userEmail)} email={userEmail} />
        </div>
      </nav>

      {/* Hero with dragon scene background */}
      <div className="relative overflow-hidden" style={{ height: 1050 }}>
        {/* Dragon scene fills the hero */}
        <div className="absolute inset-0 bg-black">
          <DragonSceneLoader />
        </div>
        {/* Vignette on all 4 edges */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #0d0d10 100%)' }} />
        {/* Extra fade at bottom to blend into page */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0d0d10] to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 pb-8 pt-16">
          <h1 className="text-6xl font-black text-center text-white mb-3 tracking-tight leading-tight drop-shadow-lg">
            Think it. Explore it.
          </h1>
          <p className="text-white/70 text-center text-lg mb-10 drop-shadow">
            Explore freely, iterate fast. Your learning, AI-powered.
          </p>

          {/* Input box */}
          <div className="w-full max-w-2xl bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl overflow-hidden shadow-2xl mb-5">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Describe the palace you want to create..."
              className="w-full bg-transparent text-white placeholder-white/50 px-5 pt-5 pb-3 text-base resize-none outline-none min-h-[100px]"
            />
            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer">
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
                className="w-10 h-10 rounded-full bg-white/90 text-[#0d0d10] hover:bg-white transition-colors disabled:opacity-30 flex items-center justify-center"
                disabled={!inputText.trim() || isGenerating}
              >
                {isGenerating ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
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

        </div>
      </div>

      {/* Recent Palaces */}
      <div className="max-w-7xl mx-auto px-6 mb-16 pt-10">
        <h2 ref={recentPalacesRef} className="text-2xl font-bold text-white mb-6 scroll-mt-6">Recent Palaces</h2>
        {palaces.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl text-white/30">
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
          <h2 ref={promptLibraryRef} className="text-2xl font-bold text-white scroll-mt-6">Discover Palace Prompts</h2>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 w-64">
            <Search className="w-4 h-4 text-white/30" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="bg-transparent text-sm text-white placeholder-white/30 outline-none flex-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold tracking-wider transition-colors ${activeFilter === tab ? 'bg-white text-[#0d0d10]' : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {filteredPrompts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl text-white/30">
            No prompts match your search. Try a different query or category.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredPrompts.map(p => {
              const isCardGenerating = generatingPromptId === p.id
              return (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/[0.08] transition-all group">
                  <div className="relative h-44 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white/70">
                        {p.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-white font-black text-sm tracking-wider uppercase mb-1">{p.title}</div>
                    <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase leading-relaxed mb-4">{p.description}</div>
                    <button
                      onClick={() => handleUsePrompt(p)}
                      disabled={!!generatingPromptId}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm text-white hover:bg-white/15 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isCardGenerating ? (
                        <><RotateCw className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        '+ Use Prompt'
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
  onSuccess: (p: any) => void
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
        onSuccess({ id: data.palaceId, title, prompt, status: 'processing', _count: { rooms: 0 }, createdAt: new Date().toISOString() })
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
      <div className="relative w-full max-w-lg bg-[#18181f] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-black text-white mb-5 tracking-wide">Create Palace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 block">Title</label>
            <input
              required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. History of Rome"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:border-[#60a5fa] outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 block">Prompt</label>
            <textarea
              required value={prompt} onChange={e => setPrompt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:border-[#60a5fa] outline-none text-sm resize-none h-24"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 block">Source Documents</label>
            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 cursor-pointer hover:border-[#60a5fa] transition-colors text-center bg-white/5">
              <input required type="file" multiple accept=".txt,.pdf,.pptx" onChange={e => e.target.files && setFiles(Array.from(e.target.files))} className="hidden" />
              <span className="text-white/40 text-sm">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload .txt / .pdf / .pptx'}</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !title || !prompt || files.length === 0}
            className="w-full py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-white/10 disabled:text-white/25 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? <><RotateCw className="w-4 h-4 animate-spin" />Generating...</> : 'Generate Palace'}
          </button>
        </form>
      </div>
    </div>
  )
}
