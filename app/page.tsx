import Link from 'next/link';
import { Sparkles, BrainCircuit, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#EEF2FF] flex flex-col items-center justify-center p-4 selection:bg-indigo-200 overflow-hidden relative">
      <main className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
        
        {/* Playful Icon floating */}
        <div className="relative animate-bounce" style={{ animationDuration: '3s' }}>
          <div className="absolute -inset-1 bg-indigo-500 rounded-[2rem] blur opacity-30 animate-pulse"></div>
          <div className="relative bg-white p-6 rounded-[2.5rem] border-4 border-indigo-100 shadow-[0_8px_0_0_rgba(224,231,255,1)]">
            <BrainCircuit className="w-20 h-20 text-indigo-600" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black text-indigo-950 font-['Baloo_2'] tracking-tight drop-shadow-sm">
            Memory <span className="text-indigo-600 inline-block hover:scale-105 transition-transform cursor-default">Palace</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-indigo-700/80 font-medium max-w-2xl mx-auto leading-relaxed px-4">
            Transform any document into a magical learning environment. 
            Upload your notes, and let AI build a mental space to help you memorize faster.
          </p>
        </div>

        <div className="pt-8 w-full max-w-sm mx-auto">
          <Link 
            href="/dashboard"
            className="group relative flex items-center justify-center gap-3 w-full bg-green-500 hover:bg-green-600 text-white px-8 py-5 rounded-3xl font-bold text-xl shadow-[0_8px_0_0_rgba(22,163,74,1)] hover:translate-y-[2px] hover:shadow-[0_6px_0_0_rgba(22,163,74,1)] active:translate-y-[8px] active:shadow-none transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span>Enter Your Palace</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </div>

      </main>

      {/* Decorative background elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute top-40 right-20 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '5s' }}></div>
      <div className="absolute -bottom-8 left-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '6s' }}></div>
    </div>
  );
}
