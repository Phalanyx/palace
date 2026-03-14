import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import DragonSceneLoader from './components/DragonSceneLoader';

export default function Home() {
  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Full-screen 3D canvas */}
      <div className="absolute inset-0">
        <DragonSceneLoader />
      </div>

      {/* Button overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-end pb-20">
        <div className="w-full max-w-sm mx-auto px-4">
          <Link
            href="/dashboard"
            className="group relative flex items-center justify-center gap-3 w-full bg-green-500 hover:bg-green-600 text-white px-8 py-5 rounded-3xl font-bold text-xl shadow-[0_8px_0_0_rgba(22,163,74,1)] hover:translate-y-[2px] hover:shadow-[0_6px_0_0_rgba(22,163,74,1)] active:translate-y-[8px] active:shadow-none transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span>Enter Your Palace</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
