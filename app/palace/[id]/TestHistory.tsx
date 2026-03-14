'use client';

import React, { useState, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';

interface GradedItem {
  objectId: string;
  questionText: string;
  correctAnswer: string;
  userAnswer: string;
  score: number;
  aiFeedback: string;
}

interface Session {
  id: string;
  status: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePct: number | null;
  startedAt: string;
  completedAt: string | null;
  questions: { gradingInstructions?: string; items?: GradedItem[] } | GradedItem[];
}

function ScoreStars({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= score ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

function SessionCard({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(session.scorePct ?? 0);
  const date = new Date(session.startedAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const questionsData = session.questions;
  const items: GradedItem[] = Array.isArray(questionsData)
    ? questionsData as GradedItem[]
    : (questionsData as any)?.items || [];
  const gradingInstructions = Array.isArray(questionsData)
    ? null
    : (questionsData as any)?.gradingInstructions;

  const scoreColor = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-indigo-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`text-3xl font-black font-['Baloo_2'] min-w-[70px] text-left ${scoreColor}`}>
            {session.status === 'completed' ? `${pct}%` : '…'}
          </div>
          <div className="text-left">
            <p className="font-bold text-indigo-900 text-sm">{date}</p>
            <p className="text-xs text-indigo-400">
              {items.length} question{items.length !== 1 ? 's' : ''} •{' '}
              {session.status === 'completed' ? `${items.reduce((s, i) => s + (i.score ?? 0), 0)} / ${items.length * 5} pts` : 'in progress'}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-indigo-400" />}
      </button>

      {open && (
        <div className="border-t border-indigo-100 p-5 space-y-4">
          {gradingInstructions && (
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 text-sm text-indigo-700">
              <span className="font-bold text-indigo-400 text-xs uppercase tracking-wide block mb-1">Grading Instructions</span>
              {gradingInstructions}
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-indigo-400 italic">No graded answers yet.</p>
          )}

          {items.map((item, i) => {
            const score = item.score ?? 0;
            const isGood = score >= 3;
            return (
              <div key={i} className={`rounded-xl p-4 border ${isGood ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-bold text-indigo-900 text-sm flex-1">{item.questionText}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ScoreStars score={score} />
                    <span className={`text-xs font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}>{score}/5</span>
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-2.5 mb-2 border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-400 mb-0.5">YOUR ANSWER</p>
                  <p className="text-sm text-indigo-900">{item.userAnswer || <em className="text-indigo-300">No answer</em>}</p>
                </div>
                {item.aiFeedback && (
                  <div className={`rounded-lg p-2.5 ${isGood ? 'bg-green-100/60' : 'bg-red-100/60'}`}>
                    <p className="text-xs font-bold mb-0.5 text-indigo-500">AI FEEDBACK</p>
                    <p className="text-sm text-gray-700">{item.aiFeedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TestHistory({ palaceId }: { palaceId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/palaces/${palaceId}/sessions`)
      .then(r => r.json())
      .then(d => setSessions(d.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [palaceId]);

  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <div className="bg-white rounded-[2rem] border-4 border-indigo-100 shadow-[0_8px_0_0_rgba(224,231,255,1)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 hover:bg-indigo-50/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-indigo-500" />
          <div className="text-left">
            <h2 className="text-2xl font-black font-['Baloo_2'] text-indigo-900">Test History</h2>
            <p className="text-sm text-indigo-400">
              {loading ? 'Loading...' : `${completedSessions.length} completed session${completedSessions.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-indigo-400" />}
      </button>

      {open && (
        <div className="border-t border-indigo-100 p-6 space-y-3">
          {loading && <p className="text-sm text-indigo-400 italic">Loading sessions...</p>}
          {!loading && sessions.length === 0 && (
            <div className="text-center py-8 text-indigo-400">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No test sessions yet. Take your first test!</p>
            </div>
          )}
          {sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}
