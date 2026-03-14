'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

interface ModelProps {
  url: string;
}

function Scene({ url }: ModelProps) {
  // Load the GLTF/GLB model
  const { scene } = useGLTF(url)
  const group = useRef<THREE.Group>(null)

  // Add slow, playful rotation to match the UI vibe
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
    }
  })

  // Center and scale the model somewhat generically, as we don't know its exact size
  return (
    <group ref={group}>
      <primitive object={scene} scale={1} position={[0, -1, 0]} />
    </group>
  )
}

export function PalaceExterior() {
  return (
    <div className="w-full h-full bg-indigo-50/50 rounded-3xl border-4 border-white shadow-[0_8px_0_0_rgba(224,231,255,1)] overflow-hidden relative">
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }}>
        {/* Soft, even lighting that matches the Claymorphism UI style */}
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={1024}
        />
        <directionalLight 
          position={[-10, 5, -5]} 
          intensity={0.5} 
          color="#a5b4fc"
        />
        
        <Scene url="/models/wrath_of_the_dragon.glb" />
        
        {/* Soft, blurred shadow underneath the model */}
        <ContactShadows 
          resolution={1024}
          scale={20}
          blur={2}
          opacity={0.5}
          far={10}
          color="#312e81"
        />
        
        {/* User can drag to rotate the palace */}
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
}
