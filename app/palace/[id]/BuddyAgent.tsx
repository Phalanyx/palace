'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, MessageSquare, X, ChevronDown } from 'lucide-react';
import { GeminiLiveClient } from '@/lib/gemini-live-client';
import { AudioStreamer, AudioPlayer } from '@/lib/media-utils';
import { buildSystemPrompt, type BuddyContextInput } from './BuddyContext';

interface RoomObject {
  label: string;
  description: string;
  sampleQuestion?: string | null;
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
  title: string;
  prompt: string;
  documents: Document[];
}

interface BuddyAgentProps {
  palace: Palace;
  currentRoom: Room | null;
  selectedObject: RoomObject | null;
  isTestMode: boolean;
  currentTestQuestion?: string;
}

interface TranscriptEntry {
  role: 'user' | 'buddy';
  text: string;
  partial?: boolean;
}

export default function BuddyAgent({
  palace,
  currentRoom,
  selectedObject,
  isTestMode,
  currentTestQuestion,
}: BuddyAgentProps) {
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [statusText, setStatusText] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const prevContextRef = useRef<string>('');

  // Build current context as a string for comparison
  const buildContext = useCallback((): BuddyContextInput => {
    return {
      palaceTitle: palace.title,
      palacePrompt: palace.prompt,
      documentSummaries: palace.documents
        .filter(d => d.rawText)
        .map(d => d.rawText!.slice(0, 3000)),
      currentRoom: currentRoom
        ? { roomKey: currentRoom.roomKey, objects: currentRoom.objects }
        : null,
      selectedObject: selectedObject
        ? {
            label: selectedObject.label,
            description: selectedObject.description,
            sampleQuestion: selectedObject.sampleQuestion ?? null,
          }
        : null,
      mode: isTestMode ? 'test-hint' : 'explore',
      currentQuestion: currentTestQuestion,
    };
  }, [palace, currentRoom, selectedObject, isTestMode, currentTestQuestion]);

  // Auto-update system prompt when context changes (only when connected)
  useEffect(() => {
    if (!connected || !clientRef.current) return;
    const ctx = buildContext();
    const prompt = buildSystemPrompt(ctx);
    if (prompt !== prevContextRef.current) {
      prevContextRef.current = prompt;
      clientRef.current.updateSystemPrompt(prompt);
      setStatusText('Context updated — reconnecting...');
      setConnected(false);
      setMicActive(false);
      streamerRef.current?.stop();
    }
  }, [currentRoom, selectedObject, isTestMode, currentTestQuestion, connected, buildContext]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  function handleConnect() {
    setError(null);
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) {
      setError('NEXT_PUBLIC_GEMINI_API_KEY is not set.');
      return;
    }

    const client = new GeminiLiveClient(apiKey);
    const player = new AudioPlayer();
    clientRef.current = client;
    playerRef.current = player;

    client.onSetupComplete = () => {
      setConnected(true);
      setStatusText('Connected — ready to talk');
    };

    client.onAudio = async (base64pcm) => {
      await player.play(base64pcm);
    };

    client.onInputTranscript = (text, finished) => {
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'user' && last.partial) {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'user', text, partial: !finished };
          return updated;
        }
        return [...prev, { role: 'user', text, partial: !finished }];
      });
    };

    client.onOutputTranscript = (text, finished) => {
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'buddy' && last.partial) {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'buddy', text, partial: !finished };
          return updated;
        }
        return [...prev, { role: 'buddy', text, partial: !finished }];
      });
    };

    client.onTurnComplete = () => {
      player.interrupt();
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

    const ctx = buildContext();
    const prompt = buildSystemPrompt(ctx);
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
    setStatusText('Disconnected');
  }

  async function handleMicToggle() {
    if (!connected || !clientRef.current) return;

    if (micActive) {
      streamerRef.current?.stop();
      streamerRef.current = null;
      setMicActive(false);
    } else {
      try {
        const streamer = new AudioStreamer(clientRef.current);
        await streamer.start();
        streamerRef.current = streamer;
        setMicActive(true);
      } catch (e: any) {
        setError('Microphone access denied: ' + e.message);
      }
    }
  }

  // Context indicator
  const contextLevel = selectedObject
    ? `Object: ${selectedObject.label}`
    : currentRoom
    ? `Room: ${currentRoom.roomKey.replace(/_/g, ' ')}`
    : 'Palace overview';

  const modeLabel = isTestMode ? '🎯 Test mode' : '🔍 Explore mode';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {isOpen && (
        <div className="w-80 bg-white rounded-[1.5rem] shadow-2xl border-2 border-indigo-100 flex flex-col overflow-hidden"
          style={{ maxHeight: '480px' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-black text-white text-sm">Study Buddy</p>
              <p className="text-indigo-200 text-xs">{statusText}</p>
            </div>
            <button onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Context pills */}
          <div className="px-3 pt-2 pb-1 flex gap-2 flex-wrap">
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium border border-indigo-100">
              {contextLevel}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              isTestMode
                ? 'bg-amber-50 text-amber-600 border-amber-100'
                : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              {modeLabel}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-3 mt-1 p-2 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
              <X className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[120px] max-h-[240px]">
            {transcript.length === 0 && (
              <p className="text-xs text-indigo-300 text-center py-4">
                {connected ? 'Start speaking...' : 'Connect to begin chatting'}
              </p>
            )}
            {transcript.map((entry, i) => (
              <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs leading-snug ${
                  entry.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-indigo-50 text-indigo-800 rounded-bl-sm'
                } ${entry.partial ? 'opacity-70' : ''}`}>
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Controls */}
          <div className="px-3 pb-3 pt-2 flex gap-2 border-t border-indigo-50">
            {!connected ? (
              <button
                onClick={handleConnect}
                className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> Connect
              </button>
            ) : (
              <>
                <button
                  onClick={handleMicToggle}
                  className={`flex-1 font-bold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
                    micActive
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {micActive ? <><MicOff className="w-4 h-4" /> Mute</> : <><Mic className="w-4 h-4" /> Talk</>}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="bg-indigo-50 text-indigo-600 font-bold py-2 px-3 rounded-xl text-sm hover:bg-indigo-100 transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all border-2 ${
          connected
            ? micActive
              ? 'bg-red-500 border-red-400 animate-pulse'
              : 'bg-indigo-600 border-indigo-500'
            : 'bg-white border-indigo-200 hover:border-indigo-400'
        }`}
      >
        <MessageSquare className={`w-6 h-6 ${connected ? 'text-white' : 'text-indigo-500'}`} />
        {connected && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
}
