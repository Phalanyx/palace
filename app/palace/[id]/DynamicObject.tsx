'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { extractMeshCode } from '@/lib/extractMeshCode';

interface DynamicObjectProps {
  objectData: {
    id: string;
    label: string;
    description: string;
    orderIndex: number;
    sampleQuestion?: string | null;
    metadata?: { meshUrl?: string; itemType?: string; [key: string]: any } | null;
    mesh?: { storageUrl: string } | null;
  };
  position: [number, number, number];
  forceOpen?: boolean;
  onClose?: () => void;
  onObjectOpen?: (id: string) => void;
  onObjectClose?: (id: string) => void;
  mode?: 'learn' | 'test';
}

const FALLBACK_CODE = `
  const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 2.5,
    roughness: 0.1,
    metalness: 0.7
  });
  return new THREE.Mesh(geometry, material);
`;

export function DynamicObject({ objectData, position, forceOpen = false, onClose, onObjectOpen, onObjectClose, mode = 'learn' }: DynamicObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  const [clicked, setClick] = useState(false);
  const [generatedObject, setGeneratedObject] = useState<THREE.Object3D | null>(null);
  const [accentColor, setAccentColor] = useState('#ff00ff');

  const isOpen = forceOpen || clicked;

  // Fetch mesh definition from Supabase at mount time
  useEffect(() => {
    // Prefer the proper Mesh DB relation, fall back to legacy metadata
    let meshUrl = objectData.mesh?.storageUrl ?? objectData.metadata?.meshUrl;

    const buildMeshFromCode = (raw: string) => {
      try {
        // Detect HTML and extract JS, or pass through raw JS (legacy .js files)
        const code = (raw.includes('<script') || raw.includes('<!DOCTYPE') || raw.includes('<html'))
          ? extractMeshCode(raw)
          : raw;
        const createMeshFn = new Function('THREE', code);
        const obj = createMeshFn(THREE);
        if (!obj) throw new Error("No object returned.");

        let foundColor = '#ff00ff';
        obj.traverse((child: any) => {
          if (child.isMesh && child.material?.color) {
            foundColor = '#' + child.material.color.getHexString();
          }
        });
        setAccentColor(foundColor);
        setGeneratedObject(obj);
      } catch (e) {
        console.error("Failed to build mesh:", e);
        const fallbackFn = new Function('THREE', FALLBACK_CODE);
        setGeneratedObject(fallbackFn(THREE));
      }
    };

    if (!meshUrl) {
      buildMeshFromCode(FALLBACK_CODE);
      return;
    }

    fetch(meshUrl)
      .then(r => {
        if (!r.ok) throw new Error("Could not fetch mesh");
        return r.text();
      })
      .then(text => buildMeshFromCode(text))
      .catch(e => {
        console.error(e);
        buildMeshFromCode(FALLBACK_CODE);
      });
  }, [objectData.mesh?.storageUrl, objectData.metadata?.meshUrl]);

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

  if (!generatedObject) return null; // still loading

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={e => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={e => { e.stopPropagation(); setHover(false); document.body.style.cursor = 'auto'; }}
      onClick={e => {
        e.stopPropagation();
        setClick(c => {
          const next = !c;
          if (next) onObjectOpen?.(objectData.id);
          else onObjectClose?.(objectData.id);
          return next;
        });
      }}
    >
      <primitive object={generatedObject} castShadow scale={[0.6, 0.6, 0.6]} />

      {/* Subtle glow — keep dim so it doesn't overpower room lighting */}
      <pointLight color={accentColor} intensity={3} distance={3} />

      {/* Click popup */}
      {isOpen && (
        <Html
          position={[0, 1.6, 0]}
          center
          zIndexRange={[100, 0]}
          distanceFactor={10}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '14px 18px',
              width: '260px',
              color: '#fff',
              fontFamily: 'var(--font-baloo), "Baloo 2", sans-serif',
              fontWeight: 500,
              fontSize: '0.875rem',
              boxShadow: `0 0 24px ${accentColor}44, 0 8px 32px rgba(0,0,0,0.3)`,
              pointerEvents: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}>
                {mode === 'test' ? '❓ Question' : (objectData.metadata?.itemType ?? objectData.label)}
              </span>
              <button
                onClick={() => { setClick(false); onClose?.(); onObjectClose?.(objectData.id); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}
              >✕</button>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.9375rem', fontWeight: 600, color: '#fff', textShadow: `0 0 12px ${accentColor}66` }}>
              {objectData.label}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
              {mode === 'test'
                ? (objectData.sampleQuestion ?? objectData.description)
                : objectData.description}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}
