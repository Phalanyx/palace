'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense, useRef, useEffect } from 'react'
import * as THREE from 'three'

// ─── Coordinate note ────────────────────────────────────────────────────────
// The GLB root has a -90° X matrix: glTF (x,y,z) → Three.js (x, -z, y)
// Key world-space references (Three.js):
//   MagicSpell center : (-30.9, -19.7, -38.3)
//   Mountain center   : (-29.1, -79.6,  18.0)
//   Dragon mesh spans : ±31 in X, -2..13 in Y (local, near origin)
// ────────────────────────────────────────────────────────────────────────────

const KEYFRAMES: { pos: [number, number, number]; target: [number, number, number] }[] = [
  // 1 – close-up of the dragon/wizard blast
  { pos: [-71.7, 31.9, 121.1], target: [-20.0, 26.6, 17.2] },
  // 2 – pushed right into the blast sphere
  { pos: [-70.4, 31.3, 44.5], target: [-25.2, 28.9, 33.1] },
  // 3 – low, looking steeply up at the dark dragon
  { pos: [-25.3, 10.8, 18.7], target: [-23.6, 11.4, 19.7] },
  // 4 – wider: full dragon silhouette over the castle
  { pos: [-26.3, 15.4, 21.8], target: [-26.3, 15.4, 0.0] },
  // 5 – interior: wizard character with stairs
  { pos: [33.3, 22.6, -2.2], target:  [-13.1, 18.7, 47.2] },
  // 6 – ground level: warrior struck by lightning, green dragon approaching
  { pos: [1.3, 5.2, 30.9], target: [1.3, 5.2, 30.7] },
  // 7 – under the green dragon's jaw (Dragon.001 root ~ (0.35, 2.4, -8.3))
  { pos: [-24.4, 8.3, -30.5], target: [-24.3, 8.3, -30.5] },
  // 8 – close on the warrior in fighting stance
  { pos: [-14.5, 15.3, -72.9], target: [-14.4, 15.2, -72.8] },
  // 9 – fire torch statue on pedestal
  { pos: [3.2, 2.4, -47.0], target: [2.3, 2.0, -48.8] },
  // 10 – water well and large tent
  { pos: [-3.7, 11.8, -33.4], target: [-8.4, 10.5, -40.3] },
  // 11 – dragon eggs in cradle with torches
  { pos: [-0.5, 22.6, -39.7], target: [-0.5, 22.5, -39.9] },
  // 12 – fortress gate from ground, sun/moon behind towers
  { pos: [-0.5, 22.5, -39.7], target: [-0.5, 22.5, -39.9] }
]

const DWELL_SEC = 1.8
const TRANSITION_SEC = 2.0
const PER_SHOT = DWELL_SEC + TRANSITION_SEC
const TOTAL_TIME = KEYFRAMES.length * PER_SHOT

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function CameraRig() {
  const { camera } = useThree()
  const elapsed = useRef(0)
  const currentPos = useRef(new THREE.Vector3(...KEYFRAMES[0].pos))
  const currentTarget = useRef(new THREE.Vector3(...KEYFRAMES[0].target))

  useFrame((_, delta) => {
    elapsed.current = (elapsed.current + delta) % TOTAL_TIME

    const t = elapsed.current
    const shotIdx = Math.floor(t / PER_SHOT)
    const timeInShot = t % PER_SHOT

    const from = KEYFRAMES[shotIdx]
    const to = KEYFRAMES[(shotIdx + 1) % KEYFRAMES.length]

    let alpha = 0
    if (timeInShot > DWELL_SEC) {
      alpha = smoothstep((timeInShot - DWELL_SEC) / TRANSITION_SEC)
    }

    currentPos.current.lerpVectors(
      new THREE.Vector3(...from.pos),
      new THREE.Vector3(...to.pos),
      alpha
    )
    currentTarget.current.lerpVectors(
      new THREE.Vector3(...from.target),
      new THREE.Vector3(...to.target),
      alpha
    )

    camera.position.copy(currentPos.current)
    camera.lookAt(currentTarget.current)
  })

  return null
}

function Dragon() {
  const { scene } = useGLTF('/models/wrath_of_the_dragon.glb')
  const conesRef = useRef<THREE.Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = Math.sin(t * 1.6) * 0.12 + Math.sin(t * 3.1) * 0.05
    conesRef.current.forEach((c, i) => {
      const mat = c.material as THREE.MeshBasicMaterial
      const base = i === 0 ? 0.18 : 0.12
      mat.opacity = base + pulse
    })
  })

  useEffect(() => {
    const added: THREE.Object3D[] = []
    conesRef.current = []

    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (!obj.name.toLowerCase().includes('magicspell')) return
      if (obj.children.some(c => c.name === '__breath_glow__')) return

      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat && 'emissive' in mat) {
        mat.emissive = new THREE.Color(0.1, 0.8, 1.0)
        mat.emissiveIntensity = 3.5
        mat.toneMapped = false
      }

      // Flat emissive overlay (same geometry, child of mesh = auto-aligned)
      const overlay = new THREE.Mesh(
        mesh.geometry,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0.3, 0.9, 1.0),
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      overlay.name = '__breath_glow__'
      mesh.add(overlay)
      added.push(overlay)

      // Extra glow layers using the same geometry — perfectly aligned by definition
      for (const [color, opacity] of [
        [new THREE.Color(0.2, 0.7, 1.0), 0.18],
        [new THREE.Color(0.0, 0.5, 0.3), 0.12],
      ] as [THREE.Color, number][]) {
        const layer = new THREE.Mesh(
          mesh.geometry,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
        )
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

const BREATH_POS: [number, number, number] = [3.3, 20.4, -2.3]
const SUN_POS: [number, number, number] = [68.7, 181.0, -330.2]

function SunGlow() {
  return (
    <group position={SUN_POS}>
      <pointLight color="#ffaa33" intensity={30} distance={300} decay={2} />
      {/* Stacked additive spheres — fakes bloom around the sun disc */}
      {([
        [30,  0xfff8e0, 0.60],
        [55,  0xffcc44, 0.32],
        [90,  0xff9900, 0.16],
        [140, 0xff6600, 0.07],
      ] as [number, number, number][]).map(([r, color, opacity], i) => (
        <mesh key={i}>
          <sphereGeometry args={[r, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
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

  return (
    <pointLight
      ref={lightRef}
      position={BREATH_POS}
      color="#44ffcc"
      intensity={22}
      distance={70}
      decay={2}
    />
  )
}

// Wizard is at approximately (0, -1, 0) in Three.js world space
// Lights match the reference: green rune-floor glow + body fill + white shaft-light from above
function WizardLights() {
  const floorRef = useRef<THREE.PointLight>(null)
  const fillRef  = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Floor rune pulses with a slow, luminous breathe
    if (floorRef.current) {
      floorRef.current.intensity = 8 + Math.sin(t * 1.8) * 3
    }
    // Body fill has a subtler secondary pulse out of phase
    if (fillRef.current) {
      fillRef.current.intensity = 3.5 + Math.sin(t * 1.8 + 1.2) * 1.2
    }
  })

  return (
    <>
      {/* Ground rune — bright green uplight from floor level */}
      <pointLight
        ref={floorRef}
        position={[0, -2.5, 0]}
        color="#00ff55"
        intensity={8}
        distance={28}
        decay={2}
      />
      {/* Mid-body fill — wraps the wizard in green */}
      <pointLight
        ref={fillRef}
        position={[0, 2, 0]}
        color="#33ff66"
        intensity={3.5}
        distance={18}
        decay={2}
      />
      {/* Overhead cool-white — mimics the falling light shafts */}
      <pointLight
        position={[0, 18, 0]}
        color="#ccffee"
        intensity={2.5}
        distance={30}
        decay={2}
      />
    </>
  )
}

export default function DragonScene() {
  return (
    <Canvas
      camera={{ position: KEYFRAMES[0].pos, fov: 50 }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} />
        <directionalLight position={[-5, 2, -5]} intensity={0.4} color="#8844ff" />
        <Dragon />
        <BreathLight />
        <SunGlow />
        <WizardLights />
        <CameraRig />
      </Suspense>
    </Canvas>
  )
}
