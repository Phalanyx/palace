'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense, useRef, useMemo, useEffect } from 'react'
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

const DWELL_SEC = 3.5
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
  useEffect(() => {
    const tmp = new THREE.Vector3()
    const box = new THREE.Box3()
    scene.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.getWorldPosition(tmp)
        box.setFromObject(obj)
        const c = new THREE.Vector3(); box.getCenter(c)
        console.log(`[DEBUG] mesh: ${obj.name} | worldPos: (${tmp.x.toFixed(1)}, ${tmp.y.toFixed(1)}, ${tmp.z.toFixed(1)}) | boxCenter: (${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)})`)
      }
    })
  }, [scene])
  return <primitive object={scene} />
}

// Dragon breath: green dragon mouth ~ (-25, 10, 20), beam aimed at blast sphere ~ (-23, 28, 28)
function DragonBreathEffect() {
  const coreRef    = useRef<THREE.Mesh>(null)
  const midRef     = useRef<THREE.Mesh>(null)
  const outerRef   = useRef<THREE.Mesh>(null)
  const glowRef    = useRef<THREE.Mesh>(null)
  const light1Ref  = useRef<THREE.PointLight>(null)
  const light2Ref  = useRef<THREE.PointLight>(null)
  const light3Ref  = useRef<THREE.PointLight>(null)

  // Quaternion to rotate cone (default up-axis +Y) to face from mouth toward blast sphere
  const quaternion = useMemo(() => {
    const from  = new THREE.Vector3(-25, 10, 20)
    const to    = new THREE.Vector3(-23, 28, 28)
    const dir   = to.clone().sub(from).normalize()
    const up    = new THREE.Vector3(0, 1, 0)
    const q     = new THREE.Quaternion().setFromUnitVectors(up, dir)
    return q
  }, [])

  // Midpoint along the beam — where lights and cones are anchored
  const beamMid   = new THREE.Vector3(-24, 19, 24)
  const mouthPos  = new THREE.Vector3(-25, 10, 20)
  const impactPos = new THREE.Vector3(-23, 28, 28)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // fast flicker for the inner core
    const flicker = 1 + Math.sin(t * 14) * 0.08 + Math.sin(t * 7.3) * 0.06
    // slow breathe for outer glow
    const breathe = 1 + Math.sin(t * 2.1) * 0.15

    if (coreRef.current)  coreRef.current.scale.setScalar(flicker)
    if (midRef.current)   midRef.current.scale.setScalar(flicker * 1.02)
    if (outerRef.current) outerRef.current.scale.setScalar(breathe)
    if (glowRef.current)  glowRef.current.scale.setScalar(breathe * 1.1)

    // Modulate the main fill light intensity
    if (light1Ref.current) light1Ref.current.intensity = 80 + Math.sin(t * 11) * 20
    if (light2Ref.current) light2Ref.current.intensity = 40 + Math.sin(t * 7 + 1) * 12
    if (light3Ref.current) light3Ref.current.intensity = 25 + Math.sin(t * 3.5 + 2) * 8
  })

  return (
    <group>
      {/* ── Lights ── */}
      {/* Scorching white-cyan at mouth */}
      <pointLight
        ref={light1Ref}
        position={mouthPos.toArray()}
        color="#aaffff"
        intensity={80}
        distance={60}
        decay={1.8}
      />
      {/* Main cyan fill along beam */}
      <pointLight
        ref={light2Ref}
        position={beamMid.toArray()}
        color="#00ddff"
        intensity={40}
        distance={50}
        decay={1.6}
      />
      {/* Soft teal glow at blast impact */}
      <pointLight
        ref={light3Ref}
        position={impactPos.toArray()}
        color="#33eeff"
        intensity={25}
        distance={45}
        decay={1.5}
      />

      {/* ── Beam cones ── all anchored at beam midpoint, oriented along beam axis ── */}

      {/* Inner core — near-white, very bright */}
      <mesh ref={coreRef} position={beamMid.toArray()} quaternion={quaternion}>
        <coneGeometry args={[1.2, 22, 16, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Mid layer — bright cyan */}
      <mesh ref={midRef} position={beamMid.toArray()} quaternion={quaternion}>
        <coneGeometry args={[2.4, 22, 16, 1, true]} />
        <meshBasicMaterial
          color="#66ffff"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer haze — wide soft cyan */}
      <mesh ref={outerRef} position={beamMid.toArray()} quaternion={quaternion}>
        <coneGeometry args={[4.5, 24, 16, 1, true]} />
        <meshBasicMaterial
          color="#00ccff"
          transparent
          opacity={0.30}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Volumetric scatter glow sphere at mouth origin */}
      <mesh position={mouthPos.toArray()}>
        <sphereGeometry args={[3.5, 16, 16]} />
        <meshBasicMaterial
          color="#aaffff"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Large diffuse corona at impact */}
      <mesh ref={glowRef} position={impactPos.toArray()}>
        <sphereGeometry args={[5.5, 16, 16]} />
        <meshBasicMaterial
          color="#33ddff"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Tiny bright spark at mouth center */}
      <mesh position={mouthPos.toArray()}>
        <sphereGeometry args={[1.0, 12, 12]} />
        <meshBasicMaterial
          color="#ffffff"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
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
        <WizardLights />
        <DragonBreathEffect />
        <CameraRig />
      </Suspense>
    </Canvas>
  )
}
