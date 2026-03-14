'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, Star, CheckCircle, XCircle, Send, ArrowLeft, ClipboardList } from 'lucide-react';
import BuddyAgent from './BuddyAgent';
import Link from 'next/link';
import { Bedroom } from './rooms/Bedroom';
import { GreatHall } from './rooms/GreatHall';
import { Kitchen } from './rooms/Kitchen';
import { Library as LibraryRoom } from './rooms/Library';

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

interface TestQuestion {
  objectId: string;
  questionText: string;
  correctAnswer: string;
  score?: number | null;
  feedback?: string | null;
  userAnswer?: string | null;
}

type AppPhase = 'explore' | 'ready_to_test' | 'starting' | 'test' | 'grading' | 'results';

const ROOM_LABELS: Record<string, string> = {
  bedroom: '🛏️ Bedroom',
  great_hall: '🏰 Great Hall',
  kitchen: '🍳 Kitchen',
  library: '📚 Library',
};

type RoomFC = React.FC<{ objects?: RoomObject[]; activeObjectIdx?: number; onCloseObject?: () => void; onObjectOpen?: (id: string) => void; onObjectClose?: (id: string) => void; mode?: 'learn' | 'test' }>;

const ROOM_COMPONENTS: Record<string, RoomFC> = {
  bedroom: Bedroom as RoomFC,
  great_hall: GreatHall as RoomFC,
  kitchen: Kitchen as RoomFC,
  library: LibraryRoom as RoomFC,
};

const ROOM_CAMERA: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  bedroom: { position: [8, 6, 10], target: [0, 3, 0] },
  great_hall: { position: [0, 12, 26], target: [0, 4, -1] },
  kitchen: { position: [0, 7, 12], target: [0, 3.5, 0] },
  library: { position: [0, 8, 14], target: [0, 4, 1] },
};

// Per-room orbit constraints — tuned to each room's size so the camera
// never zooms out far enough to see roofs/outside walls.
const ROOM_ORBIT: Record<string, {
  minDistance: number; maxDistance: number;
  minPolar: number; maxPolar: number;
  minAzimuth: number; maxAzimuth: number;
}> = {
  bedroom:    { minDistance: 6,  maxDistance: 16, minPolar: 0.6, maxPolar: Math.PI / 2.4, minAzimuth: -Math.PI / 4, maxAzimuth: Math.PI / 4 },
  great_hall: { minDistance: 8,  maxDistance: 30, minPolar: 0.4, maxPolar: Math.PI / 2.2, minAzimuth: -Math.PI / 3, maxAzimuth: Math.PI / 3 },
  kitchen:    { minDistance: 6,  maxDistance: 20, minPolar: 0.5, maxPolar: Math.PI / 2.3, minAzimuth: -Math.PI / 4, maxAzimuth: Math.PI / 4 },
  library:    { minDistance: 7,  maxDistance: 24, minPolar: 0.45, maxPolar: Math.PI / 2.3, minAzimuth: -Math.PI / 3.5, maxAzimuth: Math.PI / 3.5 },
};

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

function CameraTargetAnimator({ target, controlsRef }: { target: THREE.Vector3; controlsRef: React.RefObject<any> }) {
  useFrame(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.lerp(target, 0.07);
    controlsRef.current.update();
  });
  return null;
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-4 h-4 ${n <= score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

// Module-level so React never remounts it on parent re-render (fixes textarea focus loss)
function OverlayModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

export default function PalaceRoomView({
  rooms,
  palaceId,
  palaceTitle,
  palacePrompt,
  palaceDocuments,
}: {
  rooms: Room[];
  palaceId: string;
  palaceTitle: string;
  palacePrompt: string;
  palaceDocuments: Array<{ rawText: string | null; fileName: string | null }>;
}) {
  const [appPhase, setAppPhase] = useState<AppPhase>('explore');
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [activeObjectIdx, setActiveObjectIdx] = useState(0);
  const [gradingInstructions, setGradingInstructions] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<TestQuestion[]>([]);
  const [scorePct, setScorePct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openObjectIds, setOpenObjectIds] = useState<Set<string>>(new Set());
  const controlsRef = useRef<any>(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0, 3, 0));
  const pendingObjectIdxRef = useRef<number | null>(null);

  const activeRoom = rooms[activeRoomIdx];
  const objects = activeRoom?.objects ?? [];
  const currentObj = objects[activeObjectIdx];
  const RoomComponent = activeRoom ? ROOM_COMPONENTS[activeRoom.roomKey] : null;
  const cameraConfig = activeRoom ? ROOM_CAMERA[activeRoom.roomKey] : null;
  const orbitConfig = activeRoom ? (ROOM_ORBIT[activeRoom.roomKey] ?? ROOM_ORBIT.great_hall) : ROOM_ORBIT.great_hall;
  const slots = activeRoom ? (ROOM_SLOTS[activeRoom.roomKey] || []) : [];
  const isTestMode = appPhase === 'test';
  const currentQuestion = isTestMode ? testQuestions.find(q => q.objectId === currentObj?.id) : null;
  // Reset open objects when room changes
  useEffect(() => { setOpenObjectIds(new Set()); }, [activeRoomIdx]);

  const handleObjectOpen = (id: string) => {
    // Only one object description open at a time
    setOpenObjectIds(new Set([id]));

    // Also update the active index if this ID belongs to an object in the current room
    const objIdx = objects.findIndex(o => o.id === id);
    if (objIdx !== -1) {
      setActiveObjectIdx(objIdx);
    }
  };
  const handleObjectClose = (id: string) => setOpenObjectIds(prev => { const s = new Set(prev); s.delete(id); return s; });

  // Derive the currently-open objects with full data for BuddyAgent context
  const openObjects = objects.filter(o => openObjectIds.has(o.id));

  const isAtStart = activeRoomIdx === 0 && activeObjectIdx === 0;
  const isAtEnd = activeRoomIdx === rooms.length - 1 && activeObjectIdx === objects.length - 1;

  useEffect(() => {
    if (pendingObjectIdxRef.current != null) {
      setActiveObjectIdx(pendingObjectIdxRef.current);
      pendingObjectIdxRef.current = null;
    } else {
      setActiveObjectIdx(0);
    }
    if (cameraConfig) cameraTargetRef.current.set(...cameraConfig.target);
  }, [activeRoomIdx]);

  useEffect(() => {
    if (slots[activeObjectIdx]) {
      const [x, y, z] = slots[activeObjectIdx];
      cameraTargetRef.current.set(x, y, z);
    }
  }, [activeObjectIdx, activeRoomIdx]);

  function handleRightArrow() {
    if (appPhase === 'explore') {
      if (activeObjectIdx < objects.length - 1) setActiveObjectIdx(activeObjectIdx + 1);
      else if (activeRoomIdx < rooms.length - 1) { setActiveRoomIdx(activeRoomIdx + 1); setActiveObjectIdx(0); }
      else setAppPhase('ready_to_test');
    } else if (appPhase === 'test') {
      if (activeObjectIdx < objects.length - 1) setActiveObjectIdx(activeObjectIdx + 1);
      else if (activeRoomIdx < rooms.length - 1) { setActiveRoomIdx(activeRoomIdx + 1); setActiveObjectIdx(0); }
      else submitAnswers();
    }
  }

  function handleLeftArrow() {
    if (activeObjectIdx > 0) setActiveObjectIdx(activeObjectIdx - 1);
    else if (activeRoomIdx > 0) {
      const prevRoom = rooms[activeRoomIdx - 1];
      setActiveRoomIdx(activeRoomIdx - 1);
      setActiveObjectIdx((prevRoom?.objects?.length ?? 1) - 1);
    }
  }

  async function startSession() {
    setError(null);
    setAppPhase('starting');
    try {
      const res = await fetch(`/api/palaces/${palaceId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradingInstructions: gradingInstructions || 'Grade based on conceptual understanding and accuracy.' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start test');
      setSessionId(data.sessionId);
      setTestQuestions(data.questions);
      setAnswers({});
      setActiveRoomIdx(0);
      setActiveObjectIdx(0);
      setAppPhase('test');
    } catch (e: any) {
      setError(e.message);
      setAppPhase('ready_to_test');
    }
  }

  async function submitAnswers() {
    if (!sessionId) return;
    setAppPhase('grading');
    setError(null);
    try {
      const answersPayload = testQuestions.map(q => ({
        objectId: q.objectId,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        userAnswer: answers[q.objectId] || '',
      }));
      const res = await fetch(`/api/palaces/${palaceId}/test/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersPayload, gradingInstructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grade');
      setResults(data.gradedItems);
      setScorePct(data.scorePct);
      setAppPhase('results');
    } catch (e: any) {
      setError(e.message);
      setAppPhase('test');
    }
  }

  // ── Shared full-screen canvas backdrop ─────────────────────────────────────
  // Suppress the forceOpen popup when an overlay modal is shown on top
  const canvasActiveIdx = (appPhase === 'explore' || appPhase === 'test') ? activeObjectIdx : -1;

  const canvasBackdrop = RoomComponent && (
    <div className="absolute inset-0">
      <Canvas
        key={activeRoom?.roomKey}
        shadows
        camera={{ position: cameraConfig?.position || [12, 10, 14], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, toneMapping: 4, toneMappingExposure: 1.2 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <RoomComponent
            objects={objects}
            activeObjectIdx={canvasActiveIdx}
            onCloseObject={() => {}}
            onObjectOpen={handleObjectOpen}
            onObjectClose={handleObjectClose}
            mode={isTestMode ? 'test' : 'learn'}
          />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          target={cameraConfig?.target || [0, 3, 0]}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={orbitConfig.minDistance}
          maxDistance={orbitConfig.maxDistance}
          minPolarAngle={orbitConfig.minPolar}
          maxPolarAngle={orbitConfig.maxPolar}
          minAzimuthAngle={orbitConfig.minAzimuth}
          maxAzimuthAngle={orbitConfig.maxAzimuth}
        />
        <CameraTargetAnimator target={cameraTargetRef.current} controlsRef={controlsRef} />
      </Canvas>
    </div>
  );

  // ── Top HUD (always visible over canvas) ───────────────────────────────────
  const topHud = (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between p-4 pointer-events-none">
      {/* Left: back button */}
      <Link
        href="/dashboard"
        className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-md text-white px-4 py-2.5 rounded-full font-bold text-sm hover:bg-black/60 transition-colors border border-white/10"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Hub
      </Link>

      {/* Center: title + goal */}
      <div className="pointer-events-none text-center max-w-md px-4">
        <h1 className="text-white font-black text-xl font-['Baloo_2'] drop-shadow-lg leading-tight">{palaceTitle}</h1>
        <p className="text-white/70 text-xs font-medium drop-shadow mt-0.5 line-clamp-1">{palacePrompt}</p>
      </div>

      {/* Right: history link */}
      <Link
        href={`/palace/${palaceId}/history`}
        className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-md text-white px-4 py-2.5 rounded-full font-bold text-sm hover:bg-black/60 transition-colors border border-white/10"
      >
        <ClipboardList className="w-4 h-4" /> History
      </Link>
    </div>
  );

  // ── Phase-specific overlay content ─────────────────────────────────────────
  let overlayContent: React.ReactNode = null;

  if (appPhase === 'ready_to_test' || appPhase === 'starting') {
    const isLoading = appPhase === 'starting';
    overlayContent = (
      <OverlayModal>
        <div className="bg-white rounded-[2rem] p-8 space-y-5 shadow-2xl">
          <div className="text-center space-y-1">
            <div className="text-4xl">🏰</div>
            <h2 className="text-2xl font-black text-indigo-950 font-['Baloo_2']">You've explored the entire palace!</h2>
            <p className="text-indigo-500 text-sm font-medium">Set grading instructions and start the test.</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wide">Grading Instructions</label>
            <textarea
              value={gradingInstructions}
              onChange={e => setGradingInstructions(e.target.value)}
              placeholder="e.g. 'Focus on correct terminology. Partial credit for partially correct answers.'"
              className="w-full h-24 p-3 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-900 placeholder-indigo-300 focus:outline-none focus:border-indigo-400 resize-none text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-indigo-400">Leave blank for default grading.</p>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAppPhase('explore');
                setActiveRoomIdx(rooms.length - 1);
                setActiveObjectIdx((rooms[rooms.length - 1]?.objects?.length ?? 1) - 1);
              }}
              className="flex-1 bg-indigo-50 text-indigo-700 font-bold py-3 px-4 rounded-xl hover:bg-indigo-100 transition-colors text-sm"
              disabled={isLoading}
            >
              ← Go back
            </button>
            <button
              onClick={startSession}
              disabled={isLoading}
              className="flex-grow bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              {isLoading
                ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Loading...</>
                : <><ChevronRight className="w-4 h-4" /> Start Test</>}
            </button>
          </div>
        </div>
      </OverlayModal>
    );
  } else if (appPhase === 'grading') {
    overlayContent = (
      <OverlayModal>
        <div className="bg-white rounded-[2rem] p-12 flex flex-col items-center gap-5 shadow-2xl">
          <span className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-xl font-bold text-indigo-700">Grading your answers...</p>
        </div>
      </OverlayModal>
    );
  } else if (appPhase === 'results') {
    const totalScore = results.reduce((s, r) => s + (r.score ?? 0), 0);
    const maxScore = results.length * 5;
    const pct = Math.round(scorePct ?? 0);
    overlayContent = (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-lg space-y-4 my-auto py-20">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-8 text-white text-center shadow-2xl">
            <p className="text-base font-bold opacity-80">Your Score</p>
            <p className="text-7xl font-black font-['Baloo_2']">{pct}%</p>
            <p className="opacity-80 mt-1 text-sm">{totalScore} / {maxScore} points</p>
          </div>
          {results.map((r, i) => {
            const score = r.score ?? 0;
            const isGood = score >= 3;
            return (
              <div key={i} className={`bg-white rounded-2xl p-5 border-2 ${isGood ? 'border-green-100' : 'border-red-100'} shadow-sm`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="font-bold text-indigo-900 flex-1 text-sm">{r.questionText}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ScoreStars score={score} />
                    <span className={`text-xs font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}>{score}/5</span>
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 mb-2">
                  <p className="text-xs font-bold text-indigo-400 mb-1">YOUR ANSWER</p>
                  <p className="text-sm text-indigo-900">{r.userAnswer || <em className="text-indigo-300">No answer</em>}</p>
                </div>
                {r.feedback && (
                  <div className={`rounded-xl p-3 ${isGood ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                    <p className="text-xs font-bold mb-1 flex items-center gap-1">
                      {isGood ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      <span className={isGood ? 'text-green-600' : 'text-red-500'}>AI Feedback</span>
                    </p>
                    <p className="text-sm text-gray-700">{r.feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={() => { setAppPhase('explore'); setResults([]); setScorePct(null); setActiveRoomIdx(0); setActiveObjectIdx(0); }}
            className="w-full bg-white text-indigo-700 font-bold py-4 rounded-2xl hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Take Another Test
          </button>
        </div>
      </div>
    );
  }

  // ── Single unified return ───────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      {canvasBackdrop}
      {topHud}

      {/* Phase overlays (ready_to_test, grading, results) */}
      {overlayContent}

      {/* Explore / Test controls — only visible in explore/test phases */}
      {(appPhase === 'explore' || appPhase === 'test') && (
        <>
          {/* Room + mode indicator */}
          <div className="absolute top-16 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full border border-white/10">
                {ROOM_LABELS[activeRoom?.roomKey] || activeRoom?.roomKey}
              </span>
              {isTestMode && (
                <span className="bg-purple-600/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  Test Mode
                </span>
              )}
            </div>
          </div>

          {/* Left arrow */}
          <button
            onClick={handleLeftArrow}
            disabled={isAtStart}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right arrow */}
          <button
            onClick={handleRightArrow}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition-all"
            title={!isTestMode && isAtEnd ? 'Ready to Test' : 'Next'}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Hint badge when at last object in explore mode */}
          {!isTestMode && isAtEnd && (
            <div className="absolute right-20 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <span className="bg-indigo-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md">
                Ready to Test?
              </span>
            </div>
          )}

          {/* Bottom: dot strip + info card */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-3 p-4 pb-6">
            {objects.length > 0 && (
              <div className="flex gap-2 justify-center px-20">
                {objects.map((obj, i) => (
                  <button
                    key={obj.id}
                    onClick={() => setActiveObjectIdx(i)}
                    title={obj.label}
                    className={`h-2 rounded-full transition-all ${
                      i === activeObjectIdx ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/70 w-4'
                    }`}
                  />
                ))}
              </div>
            )}

            {currentObj && (
              <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 w-full max-w-xl border border-white/10 shadow-xl">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-white text-sm shrink-0">
                    {activeObjectIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white capitalize text-base leading-tight">{currentObj.label}</h3>

                    {!isTestMode && (
                      <p className="text-white/70 text-sm leading-snug mt-1">{currentObj.description}</p>
                    )}

                    {isTestMode && (
                      <textarea
                        value={answers[currentObj.id] || ''}
                        onChange={e => setAnswers(a => ({ ...a, [currentObj.id]: e.target.value }))}
                        placeholder="Write your answer here..."
                        className="mt-2 w-full h-20 p-2.5 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-white/50 resize-none text-sm"
                      />
                    )}
                  </div>
                  <span className="text-white/40 text-xs shrink-0 font-medium">{activeObjectIdx + 1}/{objects.length}</span>
                </div>

                {isTestMode && isAtEnd && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={submitAnswers}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm"
                    >
                      <Send className="w-4 h-4" /> Submit &amp; Grade
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-red-300 text-sm bg-red-900/40 backdrop-blur-md px-4 py-2 rounded-xl border border-red-500/30">{error}</p>
            )}
          </div>
        </>
      )}

      {/* BuddyAgent — hidden during test mode */}
      {appPhase !== 'test' && (
        <BuddyAgent
          palace={{ id: palaceId, title: palaceTitle, prompt: palacePrompt, documents: palaceDocuments }}
          currentRoom={activeRoom ?? null}
          selectedObject={currentObj ?? null}
          openObjects={openObjects}
          isTestMode={false}
          currentTestQuestion={undefined}
          rooms={rooms}
          onNavigate={useCallback((roomIndex: number, objectIndex: number) => {
            console.log('[NAV] onNavigate called:', { roomIndex, objectIndex });
            setActiveRoomIdx(prev => {
              if (prev === roomIndex) {
                // Same room — set object directly
                setActiveObjectIdx(objectIndex);
                return prev;
              }
              // Different room — stash object for the effect
              pendingObjectIdxRef.current = objectIndex;
              return roomIndex;
            });
          }, [])}
        />
      )}
    </div>
  );
}
