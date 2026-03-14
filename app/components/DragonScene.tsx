'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense, useRef, useState } from 'react'
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

function CameraRig({ onUpdate }: { onUpdate: (shot: number, pos: THREE.Vector3, target: THREE.Vector3) => void }) {
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
    onUpdate(shotIdx + 1, currentPos.current, currentTarget.current)
  })

  return null
}

function Dragon() {
  const { scene } = useGLTF('/models/wrath_of_the_dragon.glb')
  return <primitive object={scene} />
}

function fmt(v: number) { return v.toFixed(1) }

export default function DragonScene() {
  const [info, setInfo] = useState({ shot: 1, pos: [0,0,0], target: [0,0,0] })

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: KEYFRAMES[0].pos, fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <directionalLight position={[-5, 2, -5]} intensity={0.4} color="#8844ff" />
          <Dragon />
          <CameraRig onUpdate={(shot, pos, target) => setInfo({
            shot,
            pos: [+fmt(pos.x), +fmt(pos.y), +fmt(pos.z)],
            target: [+fmt(target.x), +fmt(target.y), +fmt(target.z)],
          })} />
        </Suspense>
      </Canvas>

      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(0,0,0,0.7)', color: '#0f0', fontFamily: 'monospace',
        fontSize: 12, padding: '8px 12px', borderRadius: 6, pointerEvents: 'none',
        lineHeight: 1.8,
      }}>
        <div>shot: {info.shot} / {KEYFRAMES.length}</div>
        <div>pos:    [{info.pos.join(', ')}]</div>
        <div>target: [{info.target.join(', ')}]</div>
      </div>
    </div>
  )
}
