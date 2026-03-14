'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

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
    
    // Convert old .json URLs to .js for backwards/forwards compatibility transition if dealing with newly generated ones
    if (meshUrl?.endsWith('.json')) {
         meshUrl = meshUrl.slice(0, -5) + '.js'; 
    }

    const buildMeshFromCode = (code: string) => {
      try {
        const createMeshFn = new Function('THREE', code);
        const obj = createMeshFn(THREE);
        
        // Attempt to extract an expressive color
        let foundColor = '#ff00ff'; // default neon
        obj.traverse((child: any) => {
          if (child.isMesh && child.material && child.material.color) {
            foundColor = '#' + child.material.color.getHexString();
          }
        });
        setAccentColor(foundColor);
        setGeneratedObject(obj);
      } catch (e) {
        console.error("Failed to build mesh from code:", e);
        // Fallback
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
          if (!r.ok) throw new Error("Could not fetch mesh JS code");
          return r.text();
      })
      .then(text => {
          // If we accidentally get old JSON with 'parts', try fallback
          if (text.trim().startsWith('{')) {
              console.warn("Got legacy JSON instead of JS code, applying fallback");
              buildMeshFromCode(FALLBACK_CODE);
          } else {
              buildMeshFromCode(text);
          }
      })
      .catch((e) => {
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
      <primitive object={generatedObject} castShadow />

      {/* Point light so it glows into the room */}
      <pointLight color={accentColor} intensity={20} distance={4} />

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
              background: 'rgba(10,10,20,0.92)',
              border: `2px solid ${accentColor}`,
              borderRadius: '16px',
              padding: '14px 18px',
              width: '260px',
              color: '#fff',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: `0 0 24px ${accentColor}88`,
              pointerEvents: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{
                background: accentColor,
                color: '#000',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {mode === 'test' ? '❓ Question' : (objectData.metadata?.itemType ?? objectData.label)}
              </span>
              <button
                onClick={() => { setClick(false); onClose?.(); onObjectClose?.(objectData.id); }}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer' }}
              >✕</button>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: accentColor }}>
              {objectData.label}
            </h3>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#ccc' }}>
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
