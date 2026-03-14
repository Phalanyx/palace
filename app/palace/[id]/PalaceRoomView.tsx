'use client';

import React, { useState, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Library, DoorOpen } from 'lucide-react';

// Dynamic imports for room components
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

type RoomFC = React.FC<{ objects?: RoomObject[] }>;

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

export default function PalaceRoomView({ rooms }: { rooms: Room[] }) {
  // "exterior" means show the GLB exterior, otherwise show a room key
  const [activeView, setActiveView] = useState<string>('exterior');

  const activeRoom = rooms.find(r => r.roomKey === activeView);
  const RoomComponent = activeView !== 'exterior' ? ROOM_COMPONENTS[activeView] : null;
  const cameraConfig = activeView !== 'exterior' ? ROOM_CAMERA[activeView] : null;

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
            <span className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4" />
              Exterior
            </span>
          </button>
          
          {rooms.map((room) => (
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
              <span className="ml-1 text-xs opacity-70">({room.objects.length})</span>
            </button>
          ))}
        </div>

        {/* 3D Viewport */}
        <div className="rounded-[2rem] overflow-hidden bg-white p-2 border-4 border-indigo-100 shadow-[0_8px_0_0_rgba(224,231,255,1)] flex-grow min-h-[500px]">
          {activeView === 'exterior' ? (
            <PalaceExterior />
          ) : (
            <div className="w-full h-full min-h-[480px] rounded-[1.5rem] overflow-hidden">
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
                  {RoomComponent && <RoomComponent objects={activeRoom?.objects || []} />}
                </Suspense>
                <OrbitControls
                  target={cameraConfig?.target || [0, 3, 0]}
                  enableDamping
                  dampingFactor={0.08}
                  minDistance={5}
                  maxDistance={40}
                  maxPolarAngle={Math.PI / 2}
                />
              </Canvas>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Objects for Active Room */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        <div className="bg-white rounded-[2rem] p-8 border-4 border-indigo-50 shadow-[0_8px_0_0_rgba(224,231,255,1)] flex-grow">
          <h2 className="text-3xl font-black font-['Baloo_2'] text-indigo-900 mb-6 flex items-center gap-3">
            <Library className="text-indigo-500" />
            {activeView === 'exterior' 
              ? 'All Objects' 
              : `${ROOM_LABELS[activeView] || activeView} Objects`}
          </h2>
          
          {activeView === 'exterior' ? (
            // Show all objects grouped by room
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
            // Show objects for the active room only
            !activeRoom || activeRoom.objects.length === 0 ? (
              <div className="text-center py-10 opacity-60 font-medium text-lg text-indigo-800 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200">
                No objects in this room.
              </div>
            ) : (
              <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {activeRoom.objects.map((obj) => (
                  <li key={obj.id} className="flex gap-4 p-4 rounded-2xl hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-100 transition-colors cursor-default group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 border border-indigo-200 shadow-sm group-hover:scale-110 transition-transform">
                      {obj.orderIndex}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-indigo-950 capitalize">{obj.label}</h3>
                      <p className="text-indigo-600/80 text-base leading-snug">
                        {obj.description}
                      </p>
                      {obj.sampleQuestion && (
                        <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-2 items-start opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-indigo-400 font-bold font-['Baloo_2']">Q:</span>
                          <p className="text-sm font-medium text-indigo-700 leading-snug italic">
                            {obj.sampleQuestion}
                          </p>
                        </div>
                      )}
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
