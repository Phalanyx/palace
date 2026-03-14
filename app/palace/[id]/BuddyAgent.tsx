'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, ChevronDown, Send, Bot, MapPin } from 'lucide-react';
import { GeminiLiveClient } from '@/lib/gemini-live-client';
import { AudioStreamer, AudioPlayer } from '@/lib/media-utils';
import { buildSystemPrompt, type BuddyContextInput } from './BuddyContext';
import { useAudioLevel } from './useAudioLevel';
import dynamic from 'next/dynamic';
import type { OrbState } from './VoiceOrb';

const VoiceOrb = dynamic(() => import('./VoiceOrb'), { ssr: false });

interface RoomObject {
  label: string;
  description: string;
  sampleQuestion?: string | null;
  metadata?: { itemType?: string; [key: string]: any } | null;
}

interface Room {
  roomKey: string;
  objects: RoomObject[];
}

interface Document {
  rawText?: string | null;
  fileName?: string | null;
}

interface Palace {
  id: string;
  title: string;
  prompt: string;
  documents: Document[];
}

interface BuddyAgentProps {
  palace: Palace;
  currentRoom: Room | null;
  selectedObject: RoomObject | null;
  openObjects: RoomObject[];
  isTestMode: boolean;
  currentTestQuestion?: string;
  onNavigate?: (roomIndex: number, objectIndex: number) => void;
  rooms?: Room[];
}

type MessageType = 'user' | 'user-transcript' | 'assistant' | 'system' | 'nav-card';

interface ChatMessage {
  text: string;
  type: MessageType;
  isFinished: boolean;
  navRoomIndex?: number;
  navObjectIndex?: number;
}

// Parse [NAV:roomIndex:objectIndex] from message text
function parseNavMarker(text: string): { roomIndex: number; objectIndex: number; cleanText: string } | null {
  const match = text.match(/\[NAV:(\d+):(\d+)\]/);
  if (!match) return null;
  return {
    roomIndex: parseInt(match[1], 10),
    objectIndex: parseInt(match[2], 10),
    cleanText: text.replace(/\s*\[NAV:\d+:\d+\]\s*/g, '').trim(),
  };
}

export default function BuddyAgent({
  palace,
  currentRoom,
  selectedObject,
  openObjects,
  isTestMode,
  currentTestQuestion,
  onNavigate,
  rooms,
}: BuddyAgentProps) {
  const [buddyMode, setBuddyMode] = useState<'explore' | 'quiz'>('explore');
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [statusText, setStatusText] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

  const inputLevel = useAudioLevel(inputAnalyser);
  const outputLevel = useAudioLevel(outputAnalyser);

  const orbState: OrbState = !connected ? 'idle'
    : outputLevel > 0.05 ? 'speaking'
    : micActive && inputLevel > 0.05 ? 'listening'
    : 'idle';

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevContextRef = useRef<string>('');
  const prevRoomKeyRef = useRef<string | undefined>('');
  const prevModeRef = useRef<string>('');
  const prevTestModeRef = useRef<boolean>(false);
  const didConnectRef = useRef<boolean>(false);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  // Initialize position: bottom-right corner with padding
  useEffect(() => {
    setPos({ x: window.innerWidth - 24, y: window.innerHeight - 24 });
  }, []);

  // Drag handlers — offset is always relative to the orb element (stable 56×56)
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!isDraggingRef.current) return;
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
      if (dx > 4 || dy > 4) didDragRef.current = true;

      // Clamp so orb stays fully on-screen (pos = bottom-right corner of orb)
      const orbSize = 64;
      const nx = Math.max(orbSize, Math.min(window.innerWidth, e.clientX - dragOffsetRef.current.x));
      const ny = Math.max(orbSize, Math.min(window.innerHeight, e.clientY - dragOffsetRef.current.y));
      setPos({ x: nx, y: ny });
    }
    function onPointerUp() {
      isDraggingRef.current = false;
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (!didConnectRef.current) {
      didConnectRef.current = true;
      handleConnect();
    }
  }, []);

  // Tooltip stays until user clicks Ada (dismissed in handleFloatClick)

  function handlePointerDown(e: React.PointerEvent) {
    isDraggingRef.current = true;
    didDragRef.current = false;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    // Always compute offset relative to the orb, not the container (which changes size when panel opens)
    const rect = orbRef.current?.getBoundingClientRect();
    if (rect) {
      // pos is bottom-right of orb (due to translate(-100%,-100%)), so offset from bottom-right corner
      dragOffsetRef.current = {
        x: e.clientX - (rect.right),
        y: e.clientY - (rect.bottom),
      };
    } else {
      dragOffsetRef.current = { x: 0, y: 0 };
    }
    // Capture on the orb wrapper, not e.target (which may be inside the canvas)
    orbRef.current?.setPointerCapture(e.pointerId);
  }

  function handleFloatClick() {
    if (didDragRef.current) return;
    setShowTooltip(false);
    setIsOpen(o => !o);
  }

  // addMessage — mirrors the demo app pattern
  const addMessage = useCallback(
    (text: string, type: MessageType, mode: 'add' | 'append' | 'replace' = 'add', isFinished = false) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (
          mode !== 'add' &&
          last &&
          last.type === type &&
          !last.isFinished
        ) {
          const updated = [...prev];
          const target = { ...updated[updated.length - 1] };
          updated[updated.length - 1] = target;
          if (mode === 'append') target.text += text;
          else if (mode === 'replace' && text.trim()) target.text = text;
          if (isFinished) target.isFinished = true;
          return updated;
        }
        if (!text.trim() && !isFinished) return prev;
        return [...prev, { text: text || '', type, isFinished }];
      });
    },
    []
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build context
  const buildContext = useCallback((): BuddyContextInput => ({
    palaceId: palace.id,
    palaceTitle: palace.title,
    palacePrompt: palace.prompt,
    documentSummaries: palace.documents
      .filter(d => d.rawText)
      .map(d => d.rawText!.slice(0, 3000)),
    currentRoom: currentRoom
      ? { roomKey: currentRoom.roomKey, objects: currentRoom.objects }
      : null,
    selectedObject: selectedObject
      ? { label: selectedObject.label, description: selectedObject.description, sampleQuestion: selectedObject.sampleQuestion ?? null }
      : null,
    openObjects: openObjects.map(o => ({ label: o.label, description: o.description })),
    mode: isTestMode ? 'test-hint' : buddyMode === 'quiz' ? 'buddy-quiz' : 'explore',
    currentQuestion: currentTestQuestion,
  }), [palace, currentRoom, selectedObject, openObjects, isTestMode, currentTestQuestion, buddyMode]);

  // Auto-update system prompt when context changes.
  // We ONLY reconnect for major MODE changes (explore/quiz/test)
  // or if the socket was fundamentally lost.
  useEffect(() => {
    if (!connected || !clientRef.current) return;
    
    const mode = buddyMode;
    const testMode = isTestMode;
    
    if (mode !== prevModeRef.current || testMode !== prevTestModeRef.current) {
      const prompt = buildSystemPrompt(buildContext());
      prevModeRef.current = mode;
      prevTestModeRef.current = testMode;
      prevContextRef.current = prompt;
      
      clientRef.current.updateSystemPrompt(prompt);
      setStatusText('Updating Mode...');
      setConnected(false);
      setMicActive(false);
      streamerRef.current?.stop();
    }
  }, [isTestMode, buddyMode, connected, buildContext]);

  // Silent context updates (Room changes, selection changes, popups)
  // These do NOT reboot the WebSocket, they just send a system message hint.
  useEffect(() => {
    if (!connected || !clientRef.current) return;
    
    const prompt = buildSystemPrompt(buildContext());
    if (prompt === prevContextRef.current) return;
    
    const roomKey = currentRoom?.roomKey;
    const roomChanged = roomKey !== prevRoomKeyRef.current;
    
    if (roomChanged) {
      prevRoomKeyRef.current = roomKey;
      clientRef.current.sendText(
        `[System: User has entered the room: "${roomKey?.replace(/_/g, ' ')}". ` +
        `Current topics available in this room: ${currentRoom?.objects.map(o => o.label).join(', ')}. ` +
        `Please greet them warmly and ask what they'd like to explore in this new area.]`
      );
    } else if (selectedObject) {
      clientRef.current.sendText(`[System: User is now focusing on "${selectedObject.label}". Please strictly answer questions related to this topic.]`);
    } else if (openObjects.length > 0) {
      clientRef.current.sendText(
        `[System context update: The user currently has these popups open — ` +
        openObjects.map(o => `"${o.label}": ${o.description}`).join('; ') +
        '.]'
      );
    }
    
    prevContextRef.current = prompt;
  }, [currentRoom?.roomKey, selectedObject, openObjects, currentTestQuestion, connected, buildContext]);

  function handleConnect() {
    setError(null);
    const client = new GeminiLiveClient();
    const player = new AudioPlayer();
    clientRef.current = client;
    playerRef.current = player;

    // Pre-initialize audio player (matches demo's explicit init pattern)
    player.init().then(() => {
      setOutputAnalyser(player.getAnalyser());
    }).catch(console.error);

    client.onSetupComplete = () => {
      setConnected(true);
      setStatusText('Connected');
      addMessage('Ready! Ask me anything or start speaking.', 'system');
      
      // Auto-start talking: send a system greeting prompt
      client.sendText(
        `[System: The user has just entered the palace: "${palace.title}". ` +
        `Please greet them warmly and introduce yourself as their Study Buddy. ` +
        `Keep it short and engaging.]`
      );
    };

    client.onAudio = async (base64pcm) => {
      await player.play(base64pcm);
    };

    client.onInputTranscript = (text, finished) => {
      addMessage(text, 'user-transcript', 'replace', finished);
    };

    client.onOutputTranscript = (text, finished) => {
      addMessage(text, 'assistant', 'append', finished);

      // After the turn is finished, scan the last assistant message for [NAV:x:y]
      // and spawn a nav-card message
      if (finished) {
        setMessages(prev => {
          // Find the last assistant message
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].type === 'assistant') {
              const nav = parseNavMarker(prev[i].text);
              if (nav) {
                const updated = [...prev];
                // Clean the marker out of the assistant text
                updated[i] = { ...updated[i], text: nav.cleanText };
                // Append a nav-card message
                updated.push({
                  text: '',
                  type: 'nav-card',
                  isFinished: true,
                  navRoomIndex: nav.roomIndex,
                  navObjectIndex: nav.objectIndex,
                });
                return updated;
              }
              break;
            }
          }
          return prev;
        });
      }
    };

    client.onTurnComplete = () => {
      // Nothing — audio keeps playing buffered chunks until done.
    };

    client.onInterrupted = () => {
      // Server says the AI was interrupted — stop audio playback immediately
      player.interrupt();
      addMessage('[Interrupted]', 'system');
    };

    client.onClose = () => {
      setConnected(false);
      setMicActive(false);
      setStatusText('Disconnected');
      streamerRef.current?.stop();
    };

    client.onError = (msg) => {
      setError(msg);
      setConnected(false);
      setMicActive(false);
      setStatusText('Error');
    };

    const prompt = buildSystemPrompt(buildContext());
    prevContextRef.current = prompt;
    setStatusText('Connecting...');
    client.connect(prompt);
  }

  function handleDisconnect() {
    streamerRef.current?.stop();
    clientRef.current?.disconnect();
    playerRef.current?.destroy();
    streamerRef.current = null;
    playerRef.current = null;
    clientRef.current = null;
    setConnected(false);
    setMicActive(false);
    setInputAnalyser(null);
    setOutputAnalyser(null);
    setStatusText('Disconnected');
    setMessages([]);
  }

  async function handleMicToggle() {
    if (!connected || !clientRef.current) return;
    if (micActive) {
      streamerRef.current?.stop();
      streamerRef.current = null;
      setMicActive(false);
      setInputAnalyser(null);
      addMessage('Microphone off', 'system');
    } else {
      try {
        const streamer = new AudioStreamer(clientRef.current);
        await streamer.start();
        streamerRef.current = streamer;
        setInputAnalyser(streamer.getAnalyser());
        setMicActive(true);
        addMessage('Microphone on — speak now', 'system');
      } catch (e: any) {
        setError('Microphone access denied: ' + e.message);
      }
    }
  }

  function handleSendText() {
    if (!textInput.trim() || !clientRef.current) return;
    addMessage(textInput, 'user', 'add', true);
    clientRef.current.sendText(textInput);
    setTextInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  const contextLevel = selectedObject
    ? selectedObject.label
    : currentRoom
    ? currentRoom.roomKey.replace(/_/g, ' ')
    : 'Palace overview';

  if (!pos) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex flex-col items-end gap-2"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-100%, -100%)' }}
    >
      {/* Expanded panel */}
      {isOpen && (
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: 340,
            maxHeight: 520,
            background: 'rgba(30, 30, 40, 0.65)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2)',
            fontFamily: 'var(--font-baloo), "Baloo 2", sans-serif',
            fontWeight: 500,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing select-none"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
            onPointerDown={handlePointerDown}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <Bot className="w-4 h-4 text-white" />
                </div>
                {connected && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white/20" />
                )}
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">Ada</p>
                <p className="text-white/60 text-xs mt-0.5">{statusText}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/30 hover:text-white/70 transition-colors p-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Context bar */}
          <div className="px-3 py-2 flex gap-1.5 flex-wrap items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              {contextLevel}
            </span>
            {isTestMode ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fcd34d', border: '1px solid rgba(255,255,255,0.2)' }}>
                Test mode
              </span>
            ) : (
              <>
                <button
                  onClick={() => setBuddyMode('explore')}
                  className="text-xs px-2 py-0.5 rounded-full font-medium transition-all"
                  style={buddyMode === 'explore'
                    ? { background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  Explore
                </button>
                <button
                  onClick={() => setBuddyMode('quiz')}
                  className="text-xs px-2 py-0.5 rounded-full font-medium transition-all"
                  style={buddyMode === 'quiz'
                    ? { background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  Quiz
                </button>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-3 mt-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(255,255,255,0.15)' }}>
              {error}
            </div>
          )}

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ minHeight: 160, maxHeight: 260 }}>
            {messages.length === 0 && (
              <p className="text-center text-xs py-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {connected ? 'Speak or type to begin...' : 'Connect to start chatting'}
              </p>
            )}
            {messages.map((msg, i) => {
              if (msg.type === 'system') {
                return (
                  <div key={i} className="flex justify-center">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}>
                      {msg.text}
                    </span>
                  </div>
                );
              }
              // Render nav-card as a dedicated yes/no UI
              if (msg.type === 'nav-card' && msg.navRoomIndex != null && msg.navObjectIndex != null) {
                const targetRoom = rooms?.[msg.navRoomIndex];
                const targetObj = targetRoom?.objects[msg.navObjectIndex];
                const roomLabel = targetRoom?.roomKey.replace(/_/g, ' ') ?? `Room ${msg.navRoomIndex}`;
                return (
                  <div key={i} className="flex justify-start">
                    <div
                      className="max-w-[90%] rounded-2xl overflow-hidden text-xs"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(255,255,255,0.15)' }}
                        >
                          <MapPin className="w-4 h-4 text-white/80" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold leading-tight capitalize">{roomLabel}</p>
                          {targetObj && (
                            <p className="text-white/60 leading-tight mt-0.5 truncate">{targetObj.label}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex border-t border-white/10">
                        <button
                          onClick={() => {
                            // Dismiss: replace this nav-card with a system message
                            setMessages(prev => prev.map((m, idx) =>
                              idx === i ? { text: 'Navigation dismissed', type: 'system' as MessageType, isFinished: true } : m
                            ));
                          }}
                          className="flex-1 py-2 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors font-medium"
                        >
                          Dismiss
                        </button>
                        <div className="w-px bg-white/10" />
                        <button
                          onClick={() => {
                            const navFn = onNavigateRef.current;
                            const ri = msg.navRoomIndex;
                            const oi = msg.navObjectIndex;
                            console.log('[NAV-CARD] Move clicked:', { ri, oi, hasNavFn: !!navFn });
                            if (navFn && ri != null && oi != null) {
                              navFn(ri, oi);
                            }
                            // Replace nav-card with a confirmation system message
                            setMessages(prev => prev.map((m, idx) =>
                              idx === i ? { text: `Moved to ${roomLabel}`, type: 'system' as MessageType, isFinished: true } : m
                            ));
                          }}
                          className="flex-1 py-2 font-semibold transition-colors hover:brightness-110"
                          style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}
                        >
                          Move here
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const isUser = msg.type === 'user' || msg.type === 'user-transcript';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                    style={isUser
                      ? {
                          background: 'rgba(255,255,255,0.2)',
                          color: '#fff',
                          borderBottomRightRadius: 4,
                          border: '1px solid rgba(255,255,255,0.25)',
                          opacity: msg.isFinished ? 1 : 0.7,
                        }
                      : {
                          background: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.85)',
                          borderBottomLeftRadius: 4,
                          border: '1px solid rgba(255,255,255,0.12)',
                          opacity: msg.isFinished ? 1 : 0.7,
                        }
                    }
                  >
                    {msg.text}
                    {!msg.isFinished && (
                      <span className="inline-block w-1.5 h-3 ml-1 rounded-sm animate-pulse"
                        style={{ background: 'rgba(255,255,255,0.5)', verticalAlign: 'middle' }} />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Controls */}
          <div className="px-3 pb-3 pt-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            {!connected ? (
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/25"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Phone className="w-4 h-4" /> Connect
              </button>
            ) : (
              <>
                {/* Text input */}
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                  <button
                    onClick={handleSendText}
                    disabled={!textInput.trim()}
                    className="px-3 py-2 rounded-xl transition-all"
                    style={{
                      background: textInput.trim() ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                      color: textInput.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Mic + Disconnect */}
                <div className="flex gap-2">
                  <button
                    onClick={handleMicToggle}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={micActive
                      ? { background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(255,255,255,0.2)' }
                      : { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                    }
                  >
                    {micActive ? <><MicOff className="w-3.5 h-3.5" /> Mute</> : <><Mic className="w-3.5 h-3.5" /> Talk</>}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-2 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat bubble tooltip */}
      {showTooltip && !isOpen && (
        <div
          className="absolute bottom-full right-0 mb-0 cursor-pointer"
          onClick={() => { setShowTooltip(false); setIsOpen(true); }}
          style={{ pointerEvents: 'auto' }}
        >
          <svg width="240" height="86" viewBox="0 0 240 86" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
            {/* Bubble body */}
            <rect x="1" y="1" width="238" height="74" rx="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" style={{ backdropFilter: 'blur(24px)' }} />
            {/* Short tail curving toward bottom-right */}
            <path d="M200 74 Q203 82 215 85 Q207 80 205 74" fill="rgba(255,255,255,0.15)" />
            <path d="M200 74 Q203 82 215 85" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
            <path d="M215 85 Q207 80 205 74" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
          </svg>
          <div className="absolute inset-0 flex flex-col justify-center px-5 pb-3 text-white text-xs font-medium" style={{ height: 76 }}>
            <p>Hi! I&apos;m <strong>Ada</strong>, your study buddy.</p>
            <p className="text-white/60 mt-0.5">Click me to get help studying!</p>
          </div>
        </div>
      )}

      {/* Floating orb */}
      <div
        ref={orbRef}
        onPointerDown={handlePointerDown}
        onClick={handleFloatClick}
        className="w-16 h-16 rounded-full cursor-grab active:cursor-grabbing relative touch-none transition-all duration-500 shadow-lg shadow-black/30"
        style={{ overflow: 'hidden' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/avatar.png" alt="Study buddy" className="w-full h-full object-cover rounded-full pointer-events-none select-none" draggable={false} />
      </div>
    </div>
  );
}
