"use client"

import { useState } from "react"
import { RotateCw, Trash2, ArrowRight, Lock, ArrowUp, Search, ImageIcon, Pencil, Calendar, Home, FolderOpen, BookOpen, TreePine } from "lucide-react"
import Link from "next/link"

// ─── Color palette (slate + violet, clean modern like Linear/Figma) ───────────
// bg:          #f1f5f9  slate-100
// card:        #ffffff  white
// nav:         #ffffff  white with border #e2e8f0
// border:      #e2e8f0  slate-200
// hover-border:#cbd5e1  slate-300
// text-primary:#0f172a  slate-900
// text-muted:  #64748b  slate-500
// text-dim:    #94a3b8  slate-400
// accent:      #7c3aed  violet-600
// accent-hover:#6d28d9  violet-700

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
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f3ff] border border-[#c4b5fd] text-[#7c3aed] text-[10px] font-bold tracking-widest uppercase">
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
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="#7c3aed" strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#0f172a]">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

function RoomBlocks({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 text-[#64748b] text-xs font-mono">
      <span>Rooms: {String(count).padStart(2, '0')}</span>
      <div className="flex gap-0.5">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-2 h-2 ${i < Math.min(count, 4) ? 'bg-[#7c3aed]' : 'border border-[#e2e8f0]'}`} />
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
    <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden flex flex-col hover:border-[#cbd5e1] hover:shadow-md transition-all">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <StatusBadge status={palace.status} />
        <RoomBlocks count={rooms} />
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-[#0f172a] mt-2 mb-1 leading-snug">{palace.title}</h3>
        <p className="text-[#64748b] text-sm line-clamp-2 leading-relaxed">{palace.prompt}</p>
        <div className="border-t border-dashed border-[#e2e8f0] my-4" />
        {isError ? (
          <div className="flex items-center justify-between">
            <Link href={`/palace/${palace.id}`} className="text-[#7c3aed] text-sm font-mono hover:text-[#6d28d9] transition-colors">
              Repair Architecture
            </Link>
            <button className="text-[#cbd5e1] hover:text-[#dc2626] transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {score !== undefined && <RetentionRing pct={score} />}
              <div>
                <div className="text-[#94a3b8] text-[9px] font-bold tracking-widest uppercase mb-0.5">Retention</div>
                <div className="text-[#0f172a] text-sm font-medium">Loading...</div>
              </div>
            </div>
            <Lock className="w-4 h-4 text-[#cbd5e1]" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {score !== undefined ? (
                <>
                  <RetentionRing pct={score} />
                  <div>
                    <div className="text-[#94a3b8] text-[9px] font-bold tracking-widest uppercase mb-0.5">Retention</div>
                    <div className="text-[#0f172a] text-sm font-semibold">{stabilityLabel}</div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="text-[#94a3b8] text-[9px] font-bold tracking-widest uppercase mb-0.5">Retention</div>
                  <div className="text-[#94a3b8] text-sm">Not tested yet</div>
                </div>
              )}
            </div>
            <Link href={`/palace/${palace.id}`} className="w-8 h-8 rounded-full border border-[#e2e8f0] flex items-center justify-center text-[#7c3aed] hover:bg-[#f5f3ff] transition-colors">
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
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-white">
        <div className="flex items-center gap-2 font-bold text-[#0f172a] text-lg tracking-wide">
          <TreePine className="w-5 h-5 text-[#7c3aed]" /> PALACE
        </div>
        <div className="flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-1 py-1 gap-1">
          {[
            { label: "Home", icon: <Home className="w-3.5 h-3.5" />, active: true },
            { label: "Projects", icon: <FolderOpen className="w-3.5 h-3.5" /> },
            { label: "Prompt Library", icon: <BookOpen className="w-3.5 h-3.5" /> },
          ].map(({ label, icon, active }) => (
            <button key={label} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'}`}>
              {icon}{label}
            </button>
          ))}
        </div>
        <div className="w-9 h-9 rounded-full bg-[#7c3aed] flex items-center justify-center text-sm font-bold text-white">JD</div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8">
        {/* Hero */}
        <h1 className="text-6xl font-black text-center text-[#0f172a] mb-3 tracking-tight leading-tight">
          Think it. Explore it.
        </h1>
        <p className="text-[#64748b] text-center text-lg mb-10">
          Explore freely, iterate fast. Your learning, AI-powered.
        </p>

        {/* Input box */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm mb-5">
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Describe the palace you want to create..."
            className="w-full bg-transparent text-[#0f172a] placeholder-[#94a3b8] px-5 pt-5 pb-3 text-base resize-none outline-none min-h-[120px]"
          />
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-3">
              <button className="text-[#94a3b8] hover:text-[#64748b] transition-colors"><ImageIcon className="w-5 h-5" /></button>
              <button className="text-[#94a3b8] hover:text-[#64748b] transition-colors"><Pencil className="w-5 h-5" /></button>
              <div className="w-px h-4 bg-[#e2e8f0]" />
              <button className="text-[#94a3b8] hover:text-[#64748b] transition-colors"><Calendar className="w-5 h-5" /></button>
            </div>
            <button
              onClick={() => inputText.trim() && setShowCreateModal(true)}
              className="w-10 h-10 rounded-full bg-[#0f172a] flex items-center justify-center text-white hover:bg-[#1e293b] transition-colors disabled:opacity-30"
              disabled={!inputText.trim()}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick action pills */}
        <div className="flex items-center justify-center gap-3 mb-16">
          {["Recreate Screenshot", "Import from Site", "Explore Effects"].map(label => (
            <button key={label} className="px-4 py-2 rounded-full border border-[#e2e8f0] bg-white text-sm text-[#64748b] hover:text-[#0f172a] hover:border-[#cbd5e1] transition-colors shadow-sm">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Palaces */}
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <h2 className="text-2xl font-bold text-[#0f172a] mb-6">Recent Palaces</h2>
        {palaces.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#e2e8f0] rounded-2xl text-[#94a3b8]">
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
          <h2 className="text-2xl font-black text-[#0f172a] tracking-widest uppercase">Discover Palace Prompts</h2>
          <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-2 w-64 shadow-sm">
            <Search className="w-4 h-4 text-[#94a3b8]" />
            <input placeholder="Search prompts..." className="bg-transparent text-sm text-[#0f172a] placeholder-[#94a3b8] outline-none flex-1" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold tracking-wider transition-colors ${activeFilter === tab ? 'bg-[#0f172a] text-white' : 'border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a] hover:border-[#cbd5e1]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PROMPTS.map(p => (
            <div key={p.title} className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden hover:border-[#cbd5e1] hover:shadow-md transition-all group">
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={p.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity" />
              </div>
              <div className="p-4">
                <div className="text-[#0f172a] font-black text-sm tracking-wider uppercase mb-1">{p.title}</div>
                <div className="text-[#64748b] text-[10px] font-bold tracking-widest uppercase leading-relaxed mb-4">{p.desc}</div>
                <button
                  onClick={() => { setInputText(`Create a palace inspired by: ${p.title}. ${p.desc}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm text-[#0f172a] hover:bg-[#f1f5f9] transition-colors font-medium"
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
      <div className="relative w-full max-w-lg bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-black text-[#0f172a] mb-5 tracking-wide">Create Palace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-1.5 block">Title</label>
            <input
              required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. History of Rome"
              className="w-full px-4 py-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#7c3aed] outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-1.5 block">Prompt</label>
            <textarea
              required value={prompt} onChange={e => setPrompt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#7c3aed] outline-none text-sm resize-none h-24"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-1.5 block">Source Documents</label>
            <label className="flex flex-col items-center justify-center border border-dashed border-[#e2e8f0] rounded-xl p-6 cursor-pointer hover:border-[#7c3aed] transition-colors text-center bg-[#f8fafc]">
              <input required type="file" multiple accept=".txt,.pdf,.pptx" onChange={e => e.target.files && setFiles(Array.from(e.target.files))} className="hidden" />
              <span className="text-[#64748b] text-sm">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload .txt / .pdf / .pptx'}</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !title || !prompt || files.length === 0}
            className="w-full py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? <><RotateCw className="w-4 h-4 animate-spin" />Generating...</> : 'Generate Palace'}
          </button>
        </form>
      </div>
    </div>
  )
}
