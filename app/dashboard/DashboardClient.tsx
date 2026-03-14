"use client"

import { useState } from "react"
import { UploadCloud, CheckCircle2, RotateCw, XCircle } from "lucide-react"
import Link from 'next/link'

interface DashboardProps {
  palaces: any[]
}

export default function DashboardClient({ initialPalaces }: { initialPalaces: any[] }) {
  const [palaces, setPalaces] = useState(initialPalaces)
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false)

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'processing':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span className="capitalize">{status}</span>
          </div>
        )
      case 'ready':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="capitalize">{status}</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            <span className="capitalize">{status}</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF2FF] font-sans selection:bg-indigo-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-indigo-950 font-['Baloo_2']">My Memory Palaces</h1>
            <p className="text-indigo-700/80 mt-1">Review your generated learning environments</p>
          </div>
          <button 
            onClick={() => setIsNewDrawerOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-medium shadow-[0_4px_0_0_rgba(67,56,202,1)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_rgba(67,56,202,1)] active:translate-y-[4px] active:shadow-none transition-all duration-150 cursor-pointer"
          >
            <UploadCloud className="w-5 h-5" />
            New Palace
          </button>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {palaces.map((palace) => (
            <Link 
              href={`/palace/${palace.id}`}
              key={palace.id} 
              className="group bg-white rounded-3xl p-6 border-4 border-indigo-100/50 shadow-sm hover:border-indigo-200 transition-colors duration-200 cursor-pointer relative overflow-hidden block"
            >
              <div className="flex justify-between items-start mb-4">
                <StatusBadge status={palace.status} />
                <span className="text-sm font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl">
                  {palace._count?.objects || 0} objects
                </span>
              </div>
              <h3 className="text-xl font-bold text-indigo-950 font-['Baloo_2'] mb-2">{palace.title}</h3>
              <p className="text-slate-500 text-sm line-clamp-2">{palace.prompt}</p>
              
              {palace.testSessions?.[0]?.scorePct !== undefined && (
                <div className="mt-4 pt-4 border-t border-indigo-50 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Latest Score</span>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {Math.round(palace.testSessions[0].scorePct)}%
                  </span>
                </div>
              )}
            </Link>
          ))}
          
          {palaces.length === 0 && (
            <div className="col-span-full py-16 text-center border-4 border-dashed border-indigo-200 rounded-3xl bg-indigo-50/50">
              <UploadCloud className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-indigo-900 font-['Baloo_2'] mb-2">No Palaces Yet</h3>
              <p className="text-indigo-600/70 max-w-md mx-auto">Upload a document and tell us what you want to learn to generate your first magical memory palace.</p>
            </div>
          )}
        </div>

      </div>

      {isNewDrawerOpen && (
        <NewPalaceDrawer 
          onClose={() => setIsNewDrawerOpen(false)} 
          onSuccess={(newPalace) => {
            setPalaces([newPalace, ...palaces])
            setIsNewDrawerOpen(false)
          }} 
        />
      )}
    </div>
  )
}

function NewPalaceDrawer({ onClose, onSuccess }: { onClose: () => void, onSuccess: (p: any) => void }) {
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
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
      const res = await fetch("/api/palaces", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        // Optimistic UI update
        onSuccess({
          id: data.palaceId,
          title,
          prompt,
          status: 'processing',
          _count: { objects: 0 },
          createdAt: new Date().toISOString()
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-indigo-950/20 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
        <div className="p-6 border-b border-indigo-50 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-indigo-950 font-['Baloo_2']">Create Memory Palace</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Palace Title</label>
            <input 
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. History of Rome"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Learning Goal</label>
            <textarea 
              required
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="What specific concepts do you want to extract and memorize?"
              className="w-full h-32 px-4 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Source Documents</label>
            <div className="relative border-3 border-dashed border-indigo-200 rounded-3xl bg-indigo-50/50 hover:bg-indigo-50 transition-colors p-8 text-center cursor-pointer">
              <input 
                required
                type="file" 
                multiple
                accept=".txt,.pdf,.pptx"
                onChange={e => e.target.files && setFiles(Array.from(e.target.files))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <p className="font-medium text-indigo-900">Drop files or click to browse</p>
              <p className="text-xs text-indigo-600/70 mt-1">.txt, .pdf, .pptx supported</p>
              
              {files.length > 0 && (
                <div className="mt-4 pt-4 border-t border-indigo-100 text-left">
                  <p className="text-xs font-bold text-indigo-800 mb-2">Selected files:</p>
                  <ul className="space-y-1">
                    {files.map(f => (
                      <li key={f.name} className="text-sm text-indigo-600 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {f.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-indigo-50 bg-white">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !prompt || files.length === 0}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:pointer-events-none text-white px-5 py-3.5 rounded-2xl font-bold shadow-[0_4px_0_0_rgba(67,56,202,1)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_rgba(67,56,202,1)] active:translate-y-[4px] active:shadow-none transition-all duration-150 cursor-pointer"
          >
            {isSubmitting ? (
              <><RotateCw className="w-5 h-5 animate-spin" /> Generating Palace...</>
            ) : (
              'Create Storage & Process'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
