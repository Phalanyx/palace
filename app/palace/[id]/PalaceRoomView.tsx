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
import { Dungeon } from './rooms/Dungeon';

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
  bedroom: 'Bedroom',
  great_hall: 'Great Hall',
  kitchen: 'Kitchen',
  library: 'Library',
  dungeon: 'Dungeon',
};

type RoomFC = React.FC<{ objects?: RoomObject[]; activeObjectIdx?: number; onCloseObject?: () => void; onObjectOpen?: (id: string) => void; onObjectClose?: (id: string) => void; mode?: 'learn' | 'test' }>;

const ROOM_COMPONENTS: Record<string, RoomFC> = {
  bedroom: Bedroom as RoomFC,
  great_hall: GreatHall as RoomFC,
  kitchen: Kitchen as RoomFC,
  library: LibraryRoom as RoomFC,
  dungeon: Dungeon as RoomFC,
};

const WALK_LERP = 0.03; // camera position lerp (slow walk)
const LOOK_LERP = 0.07; // camera target lerp (head turn)

const STANDOFF = 10;
const CAM_Y_OFFSET = 1.5;
const WALL_MARGIN = 1.5;

const ROOM_BOUNDS: Record<string, { halfX: number; halfZ: number }> = {
  bedroom:    { halfX: 7, halfZ: 6 },
  great_hall: { halfX: 14, halfZ: 9 },
  kitchen:    { halfX: 8, halfZ: 7 },
  library:    { halfX: 9, halfZ: 8 },
  dungeon:    { halfX: 7, halfZ: 5 },
};

function computeStandpoint(roomKey: string, slot: [number, number, number]): [number, number, number] {
  const [ox, oy, oz] = slot;
  let dx = -ox, dz = -oz;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) { dx = 0; dz = 1; } else { dx /= len; dz /= len; }
  let cx = ox + dx * STANDOFF;
  let cz = oz + dz * STANDOFF;
  const cy = oy + CAM_Y_OFFSET;
  const bounds = ROOM_BOUNDS[roomKey];
  if (bounds) {
    const maxX = bounds.halfX - WALL_MARGIN;
    const maxZ = bounds.halfZ - WALL_MARGIN;
    cx = Math.max(-maxX, Math.min(maxX, cx));
    cz = Math.max(-maxZ, Math.min(maxZ, cz));
  }
  return [cx, cy, cz];
}

const ROOM_CAMERA: Record<string, { position: [number, number, number]; target: [number, number, number]; exposure: number }> = {
  bedroom:    { position: [0, 1.6, 5],   target: [-1.5, 3.5, -2], exposure: 0.9 },
  great_hall: { position: [0, 1.6, 8],   target: [0, 5, -8],      exposure: 0.85 },
  kitchen:    { position: [0, 1.6, 5],   target: [0, 2.8, 2.5],   exposure: 1.2 },
  library:    { position: [0, 1.6, 6],   target: [0, 4.5, 4],     exposure: 1.0 },
  dungeon:    { position: [0, 1.6, 3.5], target: [-2, 3.5, 0.5],  exposure: 1.15 },
};

// Tight first-person orbit constraints — head-turning only
const ROOM_ORBIT = {
  minPolar: 0.5,
  maxPolar: Math.PI / 1.5,
  minAzimuth: -Math.PI / 3,
  maxAzimuth: Math.PI / 3,
};

const ROOM_SLOTS: Record<string, [number, number, number][]> = {
  bedroom: [
    [-1.5, 3.5, -2], [-3.8, 2.5, -2], [5.5, 3.5, 1.5], [-5, 2, 4], [6, 5, -5],
  ],
  great_hall: [
    [0, 5, -8], [-3, 2.5, 3], [3, 2.5, 3], [-7, 5, -2], [7, 5, -2],
  ],
  kitchen: [
    [0, 2.8, 2.5], [-5.5, 2.6, 3.5], [6, 3, 3], [0, 8.5, -7], [-4.5, 3.3, -3],
  ],
  library: [
    [0, 4.5, 4], [-6, 8.5, 2], [6, 8.5, 2], [-2.5, 2.5, 4], [2.5, 2.5, 4],
  ],
  dungeon: [
    [-2, 3.5, 0.5], [-4.5, 3, -3.5], [4.5, 3, -3.5], [0, 4.5, -4.3], [3.5, 4.5, 2],
  ],
};

function FirstPersonCamera({
  targetPosition,
  targetLookAt,
  controlsRef,
  onWalkingChange,
}: {
  targetPosition: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  controlsRef: React.RefObject<any>;
  onWalkingChange: (walking: boolean) => void;
}) {
  const wasWalking = useRef(true);
  useFrame(({ camera }) => {
    if (!controlsRef.current) return;
    // Lerp camera position toward standpoint
    camera.position.lerp(targetPosition, WALK_LERP);
    // Lerp the look-at target
    controlsRef.current.target.lerp(targetLookAt, LOOK_LERP);

    const dist = camera.position.distanceTo(targetPosition);
    const walking = dist > 0.15;

    if (walking) {
      // During walk: manually orient camera — do NOT call OrbitControls.update()
      // because it recalculates camera position from its internal spherical state,
      // completely overriding our lerped position.
      camera.lookAt(controlsRef.current.target);
    } else {
      // Stationary: let OrbitControls manage orientation (head-turning)
      controlsRef.current.update();
    }

    if (walking !== wasWalking.current) {
      wasWalking.current = walking;
      onWalkingChange(walking);
    }
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
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/palace_logo.png" alt="Palace" className="h-16 w-auto mb-4 drop-shadow-lg" />
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
  const [fadePhase, setFadePhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [isWalking, setIsWalking] = useState(false);
  const controlsRef = useRef<any>(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0, 3, 0));
  const cameraPositionRef = useRef(new THREE.Vector3(0, 1.6, 5));
  const pendingObjectIdxRef = useRef<number | null>(null);
  const pendingTransition = useRef<{ roomIdx: number; objectIdx: number } | null>(null);

  const activeRoom = rooms[activeRoomIdx];
  const objects = activeRoom?.objects ?? [];
  const currentObj = objects[activeObjectIdx];
  const RoomComponent = activeRoom ? ROOM_COMPONENTS[activeRoom.roomKey] : null;
  const cameraConfig = activeRoom ? ROOM_CAMERA[activeRoom.roomKey] : null;
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
    if (cameraConfig) {
      cameraTargetRef.current.set(...cameraConfig.target);
      cameraPositionRef.current.set(...cameraConfig.position);
    }
  }, [activeRoomIdx]);

  useEffect(() => {
    if (slots[activeObjectIdx] && activeRoom) {
      const [x, y, z] = slots[activeObjectIdx];
      cameraTargetRef.current.set(x, y, z);
      const sp = computeStandpoint(activeRoom.roomKey, slots[activeObjectIdx]);
      cameraPositionRef.current.set(...sp);
      setIsWalking(true);
    }
  }, [activeObjectIdx, activeRoomIdx]);

  function triggerFadeTransition(roomIdx: number, objectIdx: number) {
    pendingTransition.current = { roomIdx, objectIdx };
    setFadePhase('out');
  }

  function handleFadeEnd() {
    if (fadePhase === 'out' && pendingTransition.current) {
      const { roomIdx, objectIdx } = pendingTransition.current;
      pendingTransition.current = null;
      pendingObjectIdxRef.current = objectIdx;
      setActiveRoomIdx(roomIdx);
      requestAnimationFrame(() => setFadePhase('in'));
      // Fallback in case onTransitionEnd doesn't fire for the fade-in
      setTimeout(() => setFadePhase(prev => (prev === 'in' ? 'idle' : prev)), 450);
    } else if (fadePhase === 'in') {
      setFadePhase('idle');
    }
  }

  function handleRightArrow() {
    if (fadePhase !== 'idle') return;
    if (appPhase === 'explore') {
      if (activeObjectIdx < objects.length - 1) setActiveObjectIdx(activeObjectIdx + 1);
      else if (activeRoomIdx < rooms.length - 1) triggerFadeTransition(activeRoomIdx + 1, 0);
      else setAppPhase('ready_to_test');
    } else if (appPhase === 'test') {
      if (activeObjectIdx < objects.length - 1) setActiveObjectIdx(activeObjectIdx + 1);
      else if (activeRoomIdx < rooms.length - 1) triggerFadeTransition(activeRoomIdx + 1, 0);
      else submitAnswers();
    }
  }

  function handleLeftArrow() {
    if (fadePhase !== 'idle') return;
    if (activeObjectIdx > 0) setActiveObjectIdx(activeObjectIdx - 1);
    else if (activeRoomIdx > 0) {
      const prevRoom = rooms[activeRoomIdx - 1];
      triggerFadeTransition(activeRoomIdx - 1, (prevRoom?.objects?.length ?? 1) - 1);
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
        camera={{ position: cameraConfig?.position || [0, 1.6, 5], fov: 60, near: 0.8, far: 200 }}
        gl={{ antialias: true, toneMapping: 4, toneMappingExposure: cameraConfig?.exposure ?? 1.0 }}
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
          enableZoom={false}
          enableRotate={!isWalking}
          minPolarAngle={ROOM_ORBIT.minPolar}
          maxPolarAngle={ROOM_ORBIT.maxPolar}
          minAzimuthAngle={ROOM_ORBIT.minAzimuth}
          maxAzimuthAngle={ROOM_ORBIT.maxAzimuth}
        />
        <FirstPersonCamera
          targetPosition={cameraPositionRef.current}
          targetLookAt={cameraTargetRef.current}
          controlsRef={controlsRef}
          onWalkingChange={setIsWalking}
        />
      </Canvas>
    </div>
  );

  // ── Top HUD (always visible over canvas) ───────────────────────────────────
  const topHud = (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pointer-events-none">
      {/* Left: back button */}
      <Link
        href="/dashboard"
        className="pointer-events-auto flex items-center gap-2 bg-white/15 backdrop-blur-2xl text-white px-4 py-2.5 rounded-full font-bold text-sm hover:bg-white/25 transition-colors border border-white/20"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Hub
      </Link>

      {/* Right: history link */}
      <Link
        href={`/palace/${palaceId}/history`}
        className="pointer-events-auto flex items-center gap-2 bg-white/15 backdrop-blur-2xl text-white px-4 py-2.5 rounded-full font-bold text-sm hover:bg-white/25 transition-colors border border-white/20"
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
        <div className="bg-white/15 backdrop-blur-2xl rounded-[2rem] p-8 space-y-5 shadow-2xl border border-white/20 font-[family-name:var(--font-baloo)] font-medium text-sm">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-white">You've explored the entire palace!</h2>
            <p className="text-white/60 text-sm font-medium">Set grading instructions and start the test.</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide">Grading Instructions</label>
            <textarea
              value={gradingInstructions}
              onChange={e => setGradingInstructions(e.target.value)}
              placeholder="e.g. 'Focus on correct terminology. Partial credit for partially correct answers.'"
              className="w-full h-24 p-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/40 resize-none text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-white/40">Leave blank for default grading.</p>
          </div>
          {error && <p className="text-red-300 text-sm bg-red-500/20 border border-red-400/30 p-3 rounded-xl">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAppPhase('explore');
                setActiveRoomIdx(rooms.length - 1);
                setActiveObjectIdx((rooms[rooms.length - 1]?.objects?.length ?? 1) - 1);
              }}
              className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/20 transition-colors text-sm"
              disabled={isLoading}
            >
              ← Go back
            </button>
            <button
              onClick={startSession}
              disabled={isLoading}
              className="flex-grow bg-white/20 border border-white/25 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
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
        <div className="bg-white/15 backdrop-blur-2xl rounded-[2rem] p-12 flex flex-col items-center gap-5 shadow-2xl border border-white/20 font-[family-name:var(--font-baloo)] font-medium text-sm">
          <span className="animate-spin w-12 h-12 border-4 border-white/60 border-t-transparent rounded-full" />
          <p className="text-xl font-semibold text-white">Grading your answers...</p>
        </div>
      </OverlayModal>
    );
  } else if (appPhase === 'results') {
    const totalScore = results.reduce((s, r) => s + (r.score ?? 0), 0);
    const maxScore = results.length * 5;
    const pct = Math.round(scorePct ?? 0);
    overlayContent = (
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 overflow-y-auto font-[family-name:var(--font-baloo)] font-medium text-sm">
        <div className="w-full max-w-lg space-y-4 my-auto py-20">
          <div className="bg-white/15 backdrop-blur-2xl rounded-[2rem] p-8 text-white text-center shadow-2xl border border-white/20">
            <p className="text-base font-semibold text-white/70">Your Score</p>
            <p className="text-7xl font-black font-[family-name:var(--font-baloo)]">{pct}%</p>
            <p className="text-white/60 mt-1 text-sm">{totalScore} / {maxScore} points</p>
          </div>
          {results.map((r, i) => {
            const score = r.score ?? 0;
            const isGood = score >= 3;
            return (
              <div key={i} className={`bg-white/15 backdrop-blur-2xl rounded-2xl p-5 border ${isGood ? 'border-green-400/20' : 'border-red-400/20'} shadow-sm`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="font-semibold text-white flex-1 text-sm">{r.questionText}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ScoreStars score={score} />
                    <span className={`text-xs font-bold ${isGood ? 'text-green-400' : 'text-red-400'}`}>{score}/5</span>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 mb-2 border border-white/10">
                  <p className="text-xs font-semibold text-white/50 mb-1">YOUR ANSWER</p>
                  <p className="text-sm text-white/85">{r.userAnswer || <em className="text-white/30">No answer</em>}</p>
                </div>
                {r.feedback && (
                  <div className={`rounded-xl p-3 border ${isGood ? 'bg-green-500/10 border-green-400/20' : 'bg-red-500/10 border-red-400/20'}`}>
                    <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                      {isGood ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                      <span className={isGood ? 'text-green-400' : 'text-red-400'}>AI Feedback</span>
                    </p>
                    <p className="text-sm text-white/80">{r.feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={() => { setAppPhase('explore'); setResults([]); setScorePct(null); setActiveRoomIdx(0); setActiveObjectIdx(0); }}
            className="w-full bg-white/15 backdrop-blur-2xl border border-white/20 text-white font-semibold py-4 rounded-2xl hover:bg-white/25 transition-colors shadow-sm"
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
      {/* Fade overlay for room transitions */}
      <div
        className="absolute inset-0 z-50 bg-black pointer-events-none transition-opacity duration-[400ms]"
        style={{ opacity: fadePhase === 'out' ? 1 : 0 }}
        onTransitionEnd={handleFadeEnd}
      />
      {topHud}

      {/* Phase overlays (ready_to_test, grading, results) */}
      {overlayContent}

      {/* Explore / Test controls — only visible in explore/test phases */}
      {(appPhase === 'explore' || appPhase === 'test') && (
        <>
          {/* Left arrow */}
          <button
            onClick={handleLeftArrow}
            disabled={isAtStart || fadePhase !== 'idle'}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/15 backdrop-blur-2xl border border-white/20 text-white flex items-center justify-center hover:bg-white/25 disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right arrow */}
          <button
            onClick={handleRightArrow}
            disabled={fadePhase !== 'idle'}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/15 backdrop-blur-2xl border border-white/20 text-white flex items-center justify-center hover:bg-white/25 disabled:opacity-20 transition-all"
            title={!isTestMode && isAtEnd ? 'Ready to Test' : 'Next'}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Hint badge when at last object in explore mode */}
          {!isTestMode && isAtEnd && (
            <div className="absolute right-20 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <span className="bg-white/15 backdrop-blur-2xl text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20">
                Ready to Test?
              </span>
            </div>
          )}

          {/* Bottom: dot strip */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-3 p-4 pb-10">
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

            {isTestMode && currentObj && (
              <div className="bg-white/15 backdrop-blur-2xl rounded-2xl p-4 w-full max-w-xl border border-white/20 shadow-xl">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white capitalize text-base leading-tight mb-2">{currentObj.label}</h3>
                  <textarea
                    value={answers[currentObj.id] || ''}
                    onChange={e => setAnswers(a => ({ ...a, [currentObj.id]: e.target.value }))}
                    placeholder="Write your answer here..."
                    className="w-full h-20 p-2.5 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-white/50 resize-none text-sm"
                  />
                </div>

                {isAtEnd && (
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
                setActiveObjectIdx(objectIndex);
                return prev;
              }
              // Cross-room — use fade transition
              triggerFadeTransition(roomIndex, objectIndex);
              return prev; // don't change yet; fade handler will
            });
          }, [])}
        />
      )}
    </div>
  );
}
