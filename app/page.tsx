import DragonSceneStaticLoader from './components/DragonSceneStaticLoader'
import GlassAuthForm from './components/GlassAuthForm'

export default function Home() {
  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Full-screen 3D canvas */}
      <div className="absolute inset-0">
        <DragonSceneStaticLoader />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #000 100%)' }} />

      {/* Auth card centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <GlassAuthForm />
      </div>
    </div>
  )
}
