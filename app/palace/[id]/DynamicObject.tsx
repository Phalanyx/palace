'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

interface MeshPart {
  primitive: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'icosahedron' | 'octahedron';
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
}

interface DynamicObjectProps {
  objectData: {
    id: string;
    label: string;
    description: string;
    orderIndex: number;
    sampleQuestion?: string | null;
    metadata?: { meshUrl?: string; [key: string]: any } | null;
  };
  position: [number, number, number];
}

function PartMesh({ part }: { part: MeshPart }) {
  const color = part.color || '#ff00ff';
  const mat = (
    <meshPhysicalMaterial
      color={color}
      emissive={color}
      emissiveIntensity={2.5}
      roughness={0.1}
      metalness={0.7}
    />
  );

  const scale: [number, number, number] = [
    part.scale?.[0] ?? 1,
    part.scale?.[1] ?? 1,
    part.scale?.[2] ?? 1,
  ];

  return (
    <mesh position={part.position} scale={scale} castShadow>
      {part.primitive === 'sphere' && <sphereGeometry args={[0.5, 24, 24]} />}
      {part.primitive === 'cylinder' && <cylinderGeometry args={[0.3, 0.3, 1, 24]} />}
      {part.primitive === 'cone' && <coneGeometry args={[0.5, 1, 24]} />}
      {part.primitive === 'torus' && <torusGeometry args={[0.4, 0.14, 16, 60]} />}
      {part.primitive === 'icosahedron' && <icosahedronGeometry args={[0.5, 0]} />}
      {part.primitive === 'octahedron' && <octahedronGeometry args={[0.5, 0]} />}
      {(part.primitive === 'box' || !part.primitive) && <boxGeometry args={[0.8, 0.8, 0.8]} />}
      {mat}
    </mesh>
  );
}

const FALLBACK_PARTS: MeshPart[] = [
  { primitive: 'sphere', color: '#ff00ff', position: [0, 0, 0], scale: [1, 1, 1] },
];

export function DynamicObject({ objectData, position }: DynamicObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  const [clicked, setClick] = useState(false);
  const [parts, setParts] = useState<MeshPart[] | null>(null);

  // Fetch mesh definition from Supabase at mount time
  useEffect(() => {
    const meshUrl = objectData.metadata?.meshUrl;
    if (!meshUrl) {
      setParts(FALLBACK_PARTS);
      return;
    }
    fetch(meshUrl)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.parts) && data.parts.length > 0) {
          setParts(data.parts);
        } else {
          setParts(FALLBACK_PARTS);
        }
      })
      .catch(() => setParts(FALLBACK_PARTS));
  }, [objectData.metadata?.meshUrl]);

  // Floating bob + slow rotation
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y =
      position[1] + Math.sin(clock.elapsedTime * 1.8 + position[0]) * 0.12;
    groupRef.current.rotation.y += 0.012;
    const targetScale = hovered ? 1.25 : 1;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.12
    );
  });

  if (!parts) return null; // still loading

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={e => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={e => { e.stopPropagation(); setHover(false); document.body.style.cursor = 'auto'; }}
      onClick={e => { e.stopPropagation(); setClick(c => !c); }}
    >
      {parts.map((p, i) => <PartMesh key={i} part={p} />)}

      {/* Point light so it glows into the room */}
      <pointLight color={parts[0]?.color ?? '#ff00ff'} intensity={20} distance={4} />

      {/* Click popup */}
      {clicked && (
        <Html
          position={[0, 1.6, 0]}
          center
          zIndexRange={[100, 0]}
          distanceFactor={10}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(10,10,20,0.92)',
              border: `2px solid ${parts[0]?.color ?? '#ff00ff'}`,
              borderRadius: '16px',
              padding: '14px 18px',
              width: '260px',
              color: '#fff',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: `0 0 24px ${parts[0]?.color ?? '#ff00ff'}88`,
              pointerEvents: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{
                background: parts[0]?.color ?? '#ff00ff',
                color: '#000',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                Object {objectData.orderIndex}
              </span>
              <button
                onClick={() => setClick(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer' }}
              >✕</button>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: parts[0]?.color ?? '#ff00ff' }}>
              {objectData.label}
            </h3>
            <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.5, color: '#ccc' }}>
              {objectData.description}
            </p>
            {objectData.sampleQuestion && (
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sample Question
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#e0e0e0', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {objectData.sampleQuestion}
                </p>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
