"use client"

import { useState } from "react"
import { RotateCw, Trash2, ArrowRight, Lock, ArrowUp, Search, ImageIcon, Pencil, Calendar, Home, FolderOpen, BookOpen, TreePine } from "lucide-react"
import Link from "next/link"
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
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e4e4e0" strokeWidth="3.5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="#2563eb" strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#18181b]">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

function RoomBlocks({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 text-[#71717a] text-xs font-mono">
      <span>Rooms: {String(count).padStart(2, '0')}</span>
      <div className="flex gap-0.5">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-2 h-2 ${i < Math.min(count, 4) ? 'bg-[#2563eb]' : 'border border-[#e4e4e0]'}`} />
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
    <div className="bg-white border border-[#e4e4e0] rounded-2xl overflow-hidden flex flex-col hover:border-[#d4d4d0] hover:shadow-md transition-all">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <StatusBadge status={palace.status} />
        <RoomBlocks count={rooms} />
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-[#18181b] mt-2 mb-1 leading-snug">{palace.title}</h3>
        <p className="text-[#71717a] text-sm line-clamp-2 leading-relaxed">{palace.prompt}</p>
        <div className="border-t border-dashed border-[#e4e4e0] my-4" />
        {isError ? (
          <div className="flex items-center justify-between">
            <Link href={`/palace/${palace.id}`} className="text-[#2563eb] text-sm font-mono hover:text-[#1d4ed8] transition-colors">
              Repair Architecture
            </Link>
            <button className="text-[#d4d4d0] hover:text-[#dc2626] transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {score !== undefined && <RetentionRing pct={score} />}
              <div>
                <div className="text-[#a1a1aa] text-[9px] font-bold tracking-widest uppercase mb-0.5">Retention</div>
                <div className="text-[#18181b] text-sm font-medium">Loading...</div>
              </div>
            </div>
            <Lock className="w-4 h-4 text-[#d4d4d0]" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {score !== undefined ? (
                <>
                  <RetentionRing pct={score} />
                  <div>
                    <div className="text-[#a1a1aa] text-[9px] font-bold tracking-widest uppercase mb-0.5">Retention</div>
                    <div className="text-[#18181b] text-sm font-semibold">{stabilityLabel}</div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="text-[#a1a1aa] text-[9px] font-bold tracking-widest uppercase mb-0.5">Retention</div>
                  <div className="text-[#a1a1aa] text-sm">Not tested yet</div>
                </div>
              )}
            </div>
            <Link href={`/palace/${palace.id}`} className="w-8 h-8 rounded-full border border-[#e4e4e0] flex items-center justify-center text-[#2563eb] hover:bg-[#eff6ff] transition-colors">
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

export default function DashboardClient({ initialPalaces }: { initialPalaces: Palace[] }) {
  const [palaces, setPalaces] = useState(initialPalaces)
  const [inputText, setInputText] = useState("")
  const [activeFilter, setActiveFilter] = useState("ALL")
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#18181b] font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#e4e4e0] bg-white">
        <div className="flex items-center gap-2 font-bold text-[#18181b] text-lg tracking-wide">
          <TreePine className="w-5 h-5 text-[#2563eb]" /> PALACE
        </div>
        <div className="flex items-center bg-[#f7f7f5] border border-[#e4e4e0] rounded-full px-1 py-1 gap-1">
          {[
            { label: "Home", icon: <Home className="w-3.5 h-3.5" />, active: true },
            { label: "Projects", icon: <FolderOpen className="w-3.5 h-3.5" /> },
            { label: "Prompt Library", icon: <BookOpen className="w-3.5 h-3.5" /> },
          ].map(({ label, icon, active }) => (
            <button key={label} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? 'bg-white text-[#18181b] shadow-sm' : 'text-[#71717a] hover:text-[#18181b]'}`}>
              {icon}{label}
            </button>
          ))}
        </div>
        <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center text-sm font-bold text-white">JD</div>
      </nav>

      {/* Hero with dragon scene background */}
      <div className="relative overflow-hidden" style={{ height: 520 }}>
        {/* Dragon scene fills the hero */}
        <div className="absolute inset-0">
          <DragonSceneLoader />
        </div>
        {/* Dark gradient at bottom so content below blends in */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f7f5] to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 pb-8 pt-4">
          <h1 className="text-6xl font-black text-center text-white mb-3 tracking-tight leading-tight drop-shadow-lg">
            Think it. Explore it.
          </h1>
          <p className="text-white/70 text-center text-lg mb-10 drop-shadow">
            Explore freely, iterate fast. Your learning, AI-powered.
          </p>

          {/* Input box */}
          <div className="w-full max-w-2xl bg-white/90 backdrop-blur border border-[#e4e4e0] rounded-2xl overflow-hidden shadow-lg mb-5">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Describe the palace you want to create..."
              className="w-full bg-transparent text-[#18181b] placeholder-[#a1a1aa] px-5 pt-5 pb-3 text-base resize-none outline-none min-h-[100px]"
            />
            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center gap-3">
                <button className="text-[#a1a1aa] hover:text-[#71717a] transition-colors"><ImageIcon className="w-5 h-5" /></button>
                <button className="text-[#a1a1aa] hover:text-[#71717a] transition-colors"><Pencil className="w-5 h-5" /></button>
                <div className="w-px h-4 bg-[#e4e4e0]" />
                <button className="text-[#a1a1aa] hover:text-[#71717a] transition-colors"><Calendar className="w-5 h-5" /></button>
              </div>
              <button
                onClick={() => inputText.trim() && setShowCreateModal(true)}
                className="w-10 h-10 rounded-full bg-[#18181b] flex items-center justify-center text-white hover:bg-[#27272a] transition-colors disabled:opacity-30"
                disabled={!inputText.trim()}
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick action pills */}
          <div className="flex items-center justify-center gap-3">
            {["Recreate Screenshot", "Import from Site", "Explore Effects"].map(label => (
              <button key={label} className="px-4 py-2 rounded-full border border-white/30 bg-white/20 backdrop-blur text-sm text-white hover:bg-white/30 transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Palaces */}
      <div className="max-w-7xl mx-auto px-6 mb-16 pt-10">
        <h2 className="text-2xl font-bold text-[#18181b] mb-6">Recent Palaces</h2>
        {palaces.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#e4e4e0] rounded-2xl text-[#a1a1aa]">
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
          <h2 className="text-2xl font-black text-[#18181b] tracking-widest uppercase">Discover Palace Prompts</h2>
          <div className="flex items-center gap-2 bg-white border border-[#e4e4e0] rounded-full px-4 py-2 w-64 shadow-sm">
            <Search className="w-4 h-4 text-[#a1a1aa]" />
            <input placeholder="Search prompts..." className="bg-transparent text-sm text-[#18181b] placeholder-[#a1a1aa] outline-none flex-1" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold tracking-wider transition-colors ${activeFilter === tab ? 'bg-[#18181b] text-white' : 'border border-[#e4e4e0] bg-white text-[#71717a] hover:text-[#18181b] hover:border-[#d4d4d0]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PROMPTS.map(p => (
            <div key={p.title} className="bg-white border border-[#e4e4e0] rounded-2xl overflow-hidden hover:border-[#d4d4d0] hover:shadow-md transition-all group">
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={p.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity" />
              </div>
              <div className="p-4">
                <div className="text-[#18181b] font-black text-sm tracking-wider uppercase mb-1">{p.title}</div>
                <div className="text-[#71717a] text-[10px] font-bold tracking-widest uppercase leading-relaxed mb-4">{p.desc}</div>
                <button
                  onClick={() => { setInputText(`Create a palace inspired by: ${p.title}. ${p.desc}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f7f7f5] border border-[#e4e4e0] rounded-xl text-sm text-[#18181b] hover:bg-[#f0f0ee] transition-colors font-medium"
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border border-[#e4e4e0] rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-black text-[#18181b] mb-5 tracking-wide">Create Palace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#71717a] uppercase tracking-widest mb-1.5 block">Title</label>
            <input
              required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. History of Rome"
              className="w-full px-4 py-3 rounded-xl bg-[#f7f7f5] border border-[#e4e4e0] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#2563eb] outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#71717a] uppercase tracking-widest mb-1.5 block">Prompt</label>
            <textarea
              required value={prompt} onChange={e => setPrompt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#f7f7f5] border border-[#e4e4e0] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#2563eb] outline-none text-sm resize-none h-24"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#71717a] uppercase tracking-widest mb-1.5 block">Source Documents</label>
            <label className="flex flex-col items-center justify-center border border-dashed border-[#e4e4e0] rounded-xl p-6 cursor-pointer hover:border-[#2563eb] transition-colors text-center bg-[#f7f7f5]">
              <input required type="file" multiple accept=".txt,.pdf,.pptx" onChange={e => e.target.files && setFiles(Array.from(e.target.files))} className="hidden" />
              <span className="text-[#71717a] text-sm">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload .txt / .pdf / .pptx'}</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !title || !prompt || files.length === 0}
            className="w-full py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#e4e4e0] disabled:text-[#a1a1aa] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? <><RotateCw className="w-4 h-4 animate-spin" />Generating...</> : 'Generate Palace'}
          </button>
        </form>
      </div>
    </div>
  )
}
