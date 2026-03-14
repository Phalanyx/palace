"use client"

import dynamic from "next/dynamic"

const DragonScene = dynamic(() => import("@/app/components/DragonScene"), { ssr: false })

export default function DragonSceneLoader() {
  return <DragonScene />
}
