'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Library, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Bedroom } from './rooms/Bedroom';
import { GreatHall } from './rooms/GreatHall';
import { Kitchen } from './rooms/Kitchen';
import { Library as LibraryRoom } from './rooms/Library';
import { PalaceExterior } from './PalaceExterior';

interface RoomObject {
  id: string;
  label: string;
  description: string;
  modelKey: string;
  colorHint: string | null;
  orderIndex: number;
  sampleQuestion: string | null;
  metadata?: Record<string, any> | null;
  mesh?: { storageUrl: string } | null;
}

interface Room {
  id: string;
  roomKey: string;
  orderIndex: number;
  objects: RoomObject[];
}

const ROOM_LABELS: Record<string, string> = {
  bedroom: '🛏️ Bedroom',
  great_hall: '🏰 Great Hall',
  kitchen: '🍳 Kitchen',
  library: '📚 Library',
};

type RoomFC = React.FC<{ objects?: RoomObject[]; activeObjectIdx?: number; onCloseObject?: () => void }>;

const ROOM_COMPONENTS: Record<string, RoomFC> = {
  bedroom: Bedroom as RoomFC,
  great_hall: GreatHall as RoomFC,
  kitchen: Kitchen as RoomFC,
  library: LibraryRoom as RoomFC,
};

const ROOM_CAMERA: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  bedroom: { position: [12, 10, 14], target: [0, 3, 0] },
  great_hall: { position: [0, 12, 26], target: [0, 4, -1] },
  kitchen: { position: [0, 10, 18], target: [0, 3.5, 0] },
  library: { position: [0, 10, 20], target: [0, 4, 1] },
};

// Mirrors the slot positions defined in each room component
const ROOM_SLOTS: Record<string, [number, number, number][]> = {
  bedroom: [
    [-1.5, 3.5, -2], [-3.8, 2.5, -2], [5.5, 3.5, 1.5], [-5, 2, 4], [6, 5, -5],
  ],
  great_hall: [
    [0, 5, -8], [-3, 2.5, 3], [3, 2.5, 3], [-7, 5, -2], [7, 5, -2],
  ],
  kitchen: [
    [0, 2, 2.5], [-5.5, 2, 3.5], [6, 3, 3], [0, 8.5, -7], [-4.5, 2.5, -3],
  ],
  library: [
    [0, 2.5, 0], [-6, 7.5, 2], [6, 7.5, 2], [-2.5, 2.5, 4], [2.5, 2.5, 4],
  ],
};

// Animates OrbitControls target smoothly to a slot position
function CameraTargetAnimator({
  target,
  controlsRef,
}: {
  target: THREE.Vector3;
  controlsRef: React.RefObject<any>;
}) {
  useFrame(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.lerp(target, 0.07);
    controlsRef.current.update();
  });
  return null;
}

export default function PalaceRoomView({ rooms }: { rooms: Room[] }) {
  const [activeView, setActiveView] = useState<string>('exterior');
  const [activeObjectIdx, setActiveObjectIdx] = useState<number>(0);
  const controlsRef = useRef<any>(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0, 3, 0));

  const activeRoom = rooms.find(r => r.roomKey === activeView);
  const RoomComponent = activeView !== 'exterior' ? ROOM_COMPONENTS[activeView] : null;
  const cameraConfig = activeView !== 'exterior' ? ROOM_CAMERA[activeView] : null;
  const slots = activeView !== 'exterior' ? (ROOM_SLOTS[activeView] || []) : [];
  const objects = activeRoom?.objects || [];

  // When room changes, reset object index
  useEffect(() => {
    setActiveObjectIdx(0);
    if (cameraConfig) {
      cameraTargetRef.current.set(...cameraConfig.target);
    }
  }, [activeView]);

  // When active object changes, animate camera to that slot
  useEffect(() => {
    if (slots[activeObjectIdx]) {
      const [x, y, z] = slots[activeObjectIdx];
      cameraTargetRef.current.set(x, y, z);
    }
  }, [activeObjectIdx, activeView]);

  const currentObj = objects[activeObjectIdx];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">

      {/* Left Column: 3D Viewport + Room Tabs */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Room Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView('exterior')}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border-2 ${
              activeView === 'exterior'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_3px_0_0_rgba(79,70,229,0.5)]'
                : 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 shadow-[0_3px_0_0_rgba(224,231,255,1)] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_rgba(224,231,255,1)]'
            }`}
          >
            <span className="flex items-center gap-2">🏰 Palace</span>
          </button>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveView(room.roomKey)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border-2 ${
                activeView === room.roomKey
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_3px_0_0_rgba(79,70,229,0.5)]'
                  : 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 shadow-[0_3px_0_0_rgba(224,231,255,1)] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_rgba(224,231,255,1)]'
              }`}
            >
              {ROOM_LABELS[room.roomKey] || room.roomKey}
            </button>
          ))}
        </div>

        {/* 3D Viewport */}
        <div className="rounded-[2rem] overflow-hidden bg-white p-2 border-4 border-indigo-100 shadow-[0_8px_0_0_rgba(224,231,255,1)] flex-grow flex flex-col min-h-[500px]">
          <div className="flex-grow min-h-[440px] rounded-[1.5rem] overflow-hidden relative">
            {activeView === 'exterior' ? (
              <PalaceExterior />
            ) : (
              <Canvas
                shadows
                camera={{
                  position: cameraConfig?.position || [12, 10, 14],
                  fov: 50,
                  near: 0.1,
                  far: 200,
                }}
                gl={{ antialias: true, toneMapping: 4, toneMappingExposure: 1.2 }}
              >
                <Suspense fallback={null}>
                  {RoomComponent && (
                    <RoomComponent
                      objects={objects}
                      activeObjectIdx={activeObjectIdx}
                      onCloseObject={() => setActiveObjectIdx(-1)}
                    />
                  )}
                </Suspense>
                <OrbitControls
                  ref={controlsRef}
                  target={cameraConfig?.target || [0, 3, 0]}
                  enableDamping
                  dampingFactor={0.08}
                  minDistance={5}
                  maxDistance={40}
                  maxPolarAngle={Math.PI / 2}
                />
                <CameraTargetAnimator
                  target={cameraTargetRef.current}
                  controlsRef={controlsRef}
                />
              </Canvas>
            )}
          </div>

          {/* Object Slideshow Strip — shown when inside a room with objects */}
          {activeView !== 'exterior' && objects.length > 0 && (
            <div className="px-3 pb-2 pt-3 flex items-center gap-3">
              <button
                onClick={() => setActiveObjectIdx(i => Math.max(0, i - 1))}
                disabled={activeObjectIdx === 0}
                className="w-9 h-9 rounded-full bg-indigo-100 hover:bg-indigo-200 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-indigo-700" />
              </button>

              {/* Object dots */}
              <div className="flex gap-2 flex-1 overflow-x-auto no-scrollbar">
                {objects.map((obj, i) => (
                  <button
                    key={obj.id}
                    onClick={() => setActiveObjectIdx(i)}
                    title={obj.label}
                    className={`shrink-0 h-2 rounded-full transition-all ${
                      i === activeObjectIdx
                        ? 'bg-indigo-600 w-8'
                        : 'bg-indigo-200 hover:bg-indigo-300 w-4'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setActiveObjectIdx(i => Math.min(objects.length - 1, i + 1))}
                disabled={activeObjectIdx === objects.length - 1}
                className="w-9 h-9 rounded-full bg-indigo-100 hover:bg-indigo-200 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0"
              >
                <ChevronRight className="w-5 h-5 text-indigo-700" />
              </button>
            </div>
          )}
        </div>

        {/* Active Object Card (below viewport) */}
        {activeView !== 'exterior' && currentObj && (
          <div className="bg-white rounded-2xl p-5 border-2 border-indigo-100 shadow-sm flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0">
              {activeObjectIdx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-indigo-950 capitalize">{currentObj.label}</h3>
              <p className="text-indigo-600/80 text-sm leading-snug mt-0.5">{currentObj.description}</p>
              {currentObj.sampleQuestion && (
                <div className="mt-2 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Sample Q: </span>
                  <span className="text-sm text-indigo-700 italic">{currentObj.sampleQuestion}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-indigo-400 shrink-0">
              <Eye className="w-3.5 h-3.5" />
              <span>{activeObjectIdx + 1}/{objects.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Objects for Active Room */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white rounded-[2rem] p-8 border-4 border-indigo-50 shadow-[0_8px_0_0_rgba(224,231,255,1)] flex-grow">
          <h2 className="text-3xl font-black font-['Baloo_2'] text-indigo-900 mb-6 flex items-center gap-3">
            <Library className="text-indigo-500" />
            {activeView === 'exterior' ? 'All Objects' : `${ROOM_LABELS[activeView] || activeView} Objects`}
          </h2>

          {activeView === 'exterior' ? (
            rooms.length === 0 ? (
              <div className="text-center py-10 opacity-60 font-medium text-lg text-indigo-800 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200">
                No rooms generated yet.
              </div>
            ) : (
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {rooms.map((room) => (
                  <div key={room.id}>
                    <button
                      onClick={() => setActiveView(room.roomKey)}
                      className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-2 hover:text-indigo-700 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      {ROOM_LABELS[room.roomKey] || room.roomKey}
                      <span className="text-xs font-medium text-indigo-300">→ Enter</span>
                    </button>
                    <ul className="space-y-2">
                      {room.objects.map((obj) => (
                        <li key={obj.id} className="flex gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-sm text-indigo-600">
                            {obj.orderIndex}
                          </div>
                          <div>
                            <h3 className="font-bold text-indigo-950 capitalize">{obj.label}</h3>
                            <p className="text-sm text-indigo-600/70 line-clamp-1">{obj.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )
          ) : (
            !activeRoom || activeRoom.objects.length === 0 ? (
              <div className="text-center py-10 opacity-60 font-medium text-lg text-indigo-800 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200">
                No objects in this room.
              </div>
            ) : (
              <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {activeRoom.objects.map((obj, i) => (
                  <li
                    key={obj.id}
                    onClick={() => setActiveObjectIdx(i)}
                    className={`flex gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      i === activeObjectIdx
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'border-transparent hover:bg-indigo-50/50 hover:border-indigo-100'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black border shadow-sm transition-all ${
                      i === activeObjectIdx
                        ? 'bg-indigo-600 text-white border-indigo-600 scale-110'
                        : 'bg-indigo-100 text-indigo-600 border-indigo-200'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-indigo-950 capitalize">{obj.label}</h3>
                      <p className="text-indigo-600/80 text-sm leading-snug line-clamp-2">{obj.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    </div>
  );
}
