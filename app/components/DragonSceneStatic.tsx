'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense, useRef, useEffect } from 'react'
import * as THREE from 'three'

// Keyframe 1: close-up of the dragon/wizard blast
const CAM_POS: [number, number, number] = [-71.7, 31.9, 121.1]
const CAM_TARGET: [number, number, number] = [-20.0, 26.6, 17.2]

const SUN_POS: [number, number, number] = [68.7, 181.0, -330.2]
const BREATH_POS: [number, number, number] = [3.3, 20.4, -2.3]

function Dragon() {
  const { scene } = useGLTF('/models/wrath_of_the_dragon.glb')
  const conesRef = useRef<THREE.Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = Math.sin(t * 1.6) * 0.12 + Math.sin(t * 3.1) * 0.05
    conesRef.current.forEach((c, i) => {
      const mat = c.material as THREE.MeshBasicMaterial
      mat.opacity = (i === 0 ? 0.18 : 0.12) + pulse
    })
  })

  useEffect(() => {
    const added: THREE.Object3D[] = []
    conesRef.current = []
    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const isBreath = obj.name.toLowerCase().includes('magicspell')
      const isWizard = obj.name === 'Wizard_0' || obj.name === 'LeaderWarrior_0'
      if (!isBreath && !isWizard) return
      if (obj.children.some(c => c.name === '__breath_glow__')) return

      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat && 'emissive' in mat) {
        if (isWizard) {
          const wizMat = mat.clone()
          wizMat.emissiveIntensity = 10.0
          wizMat.toneMapped = false
          mesh.material = wizMat
        } else {
          mat.emissive = new THREE.Color(0.1, 0.8, 1.0)
          mat.emissiveIntensity = 3.5
          mat.toneMapped = false
        }
      }

      if (isWizard) {
        for (const [color, opacity] of [
          [new THREE.Color(0.2, 1.0, 0.4), 0.35],
          [new THREE.Color(0.1, 0.6, 0.3), 0.20],
        ] as [THREE.Color, number][]) {
          const layer = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }))
          layer.name = '__breath_glow__'
          mesh.add(layer)
          added.push(layer)
        }
        return
      }

      const overlay = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.9, 1.0), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }))
      overlay.name = '__breath_glow__'
      mesh.add(overlay)
      added.push(overlay)

      for (const [color, opacity] of [
        [new THREE.Color(0.2, 0.7, 1.0), 0.18],
        [new THREE.Color(0.0, 0.5, 0.3), 0.12],
      ] as [THREE.Color, number][]) {
        const layer = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }))
        layer.name = '__breath_glow__'
        mesh.add(layer)
        added.push(layer)
        conesRef.current.push(layer)
      }
    })
    return () => { added.forEach(o => o.parent?.remove(o)) }
  }, [scene])

  return <primitive object={scene} />
}

function SunGlow() {
  const lightRef = useRef<THREE.PointLight>(null)
  const matsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const layers: [number, number, number][] = [
    [30, 0xfff8e0, 0.85],
    [55, 0xffcc44, 0.55],
    [90, 0xff9900, 0.30],
  ]
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = Math.sin(t * 0.9) * 0.18 + Math.sin(t * 2.1) * 0.08
    if (lightRef.current) lightRef.current.intensity = 80 + pulse * 80
    matsRef.current.forEach((mat, i) => { mat.opacity = Math.max(0, layers[i][2] + pulse) })
  })
  return (
    <group position={SUN_POS}>
      <pointLight ref={lightRef} color="#ffaa33" intensity={80} distance={500} decay={1.5} />
      {layers.map(([r, color, opacity], i) => (
        <mesh key={i}>
          <sphereGeometry args={[r, 16, 16]} />
          <meshBasicMaterial ref={m => { if (m) matsRef.current[i] = m }} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function BreathLight() {
  const lightRef = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (!lightRef.current) return
    const t = clock.getElapsedTime()
    lightRef.current.intensity = 22 + Math.sin(t * 1.6) * 6 + Math.sin(t * 3.1) * 3
  })
  return <pointLight ref={lightRef} position={BREATH_POS} color="#44ffcc" intensity={22} distance={70} decay={2} />
}

export default function DragonSceneStatic() {
  return (
    <Canvas
      camera={{ position: CAM_POS, fov: 50 }}
      style={{ background: 'transparent' }}
      onCreated={({ camera }) => { camera.lookAt(...CAM_TARGET) }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} />
        <directionalLight position={[-5, 2, -5]} intensity={0.4} color="#8844ff" />
        <Dragon />
        <BreathLight />
        <SunGlow />
      </Suspense>
    </Canvas>
  )
}
