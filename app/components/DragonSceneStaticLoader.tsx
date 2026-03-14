'use client'

import dynamic from 'next/dynamic'

const DragonSceneStatic = dynamic(() => import('./DragonSceneStatic'), { ssr: false })

export default function DragonSceneStaticLoader() {
  return <DragonSceneStatic />
}
