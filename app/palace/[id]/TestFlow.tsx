'use client';

import React, { useState } from 'react';
import { ChevronRight, CheckCircle, XCircle, Send, BookOpen, Star } from 'lucide-react';

interface Question {
  objectId: string;
  questionText: string;
  correctAnswer: string;
  userAnswer?: string | null;
  score?: number | null;
  feedback?: string | null;
}

type Phase = 'idle' | 'setup' | 'loading' | 'quiz' | 'submitting' | 'results';

export default function TestFlow({ palaceId }: { palaceId: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [gradingInstructions, setGradingInstructions] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Question[]>([]);
  const [scorePct, setScorePct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startSession() {
    setPhase('loading');
    setError(null);
    try {
      const res = await fetch(`/api/palaces/${palaceId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradingInstructions: gradingInstructions || 'Grade based on conceptual understanding and accuracy.' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start test');
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setAnswers({});
      setCurrentIdx(0);
      setPhase('quiz');
    } catch (e: any) {
      setError(e.message);
      setPhase('setup');
    }
  }

  async function submitAnswers() {
    if (!sessionId) return;
    setPhase('submitting');
    setError(null);
    try {
      const answersPayload = questions.map((q, i) => ({
        objectId: q.objectId,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        userAnswer: answers[i] || '',
      }));
      const res = await fetch(`/api/palaces/${palaceId}/test/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersPayload, gradingInstructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grade');
      setResults(data.gradedItems.map((g: any) => ({
        ...g,
        score: g.score,
        feedback: g.feedback,
      })));
      setScorePct(data.scorePct);
      setPhase('results');
    } catch (e: any) {
      setError(e.message);
      setPhase('quiz');
    }
  }

  function ScoreStars({ score }: { score: number }) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star
            key={n}
            className={`w-4 h-4 ${n <= score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  }

  // IDLE — "Take a Test" button
  if (phase === 'idle') {
    return (
      <button
        onClick={() => setPhase('setup')}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_4px_0_0_rgba(79,70,229,0.5)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-2 text-lg"
      >
        <BookOpen className="w-5 h-5" />
        Take a Test
      </button>
    );
  }

  // SETUP — grading instructions
  if (phase === 'setup' || phase === 'loading') {
    return (
      <div className="bg-white rounded-[2rem] p-8 border-4 border-indigo-100 shadow-[0_8px_0_0_rgba(224,231,255,1)] space-y-6">
        <h2 className="text-3xl font-black text-indigo-950 font-['Baloo_2']">⚙️ Test Setup</h2>
        <div>
          <label className="block text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wide">
            Grading Instructions
          </label>
          <textarea
            value={gradingInstructions}
            onChange={e => setGradingInstructions(e.target.value)}
            placeholder="Tell the AI how to grade you. e.g. 'Focus on correct use of terminology. Be strict about technical accuracy. Partial credit for partially correct answers.'"
            className="w-full h-28 p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-900 placeholder-indigo-300 focus:outline-none focus:border-indigo-400 resize-none text-sm"
            disabled={phase === 'loading'}
          />
          <p className="text-xs text-indigo-400 mt-1">Leave blank for default grading (conceptual understanding).</p>
        </div>
        {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setPhase('idle')}
            className="flex-1 bg-indigo-50 text-indigo-700 font-bold py-3 px-6 rounded-xl hover:bg-indigo-100 transition-colors"
            disabled={phase === 'loading'}
          >
            Cancel
          </button>
          <button
            onClick={startSession}
            disabled={phase === 'loading'}
            className="flex-2 flex-grow bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {phase === 'loading' ? (
              <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" /> Loading questions...</>
            ) : (
              <><ChevronRight className="w-4 h-4" /> Start Test</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // QUIZ — one question at a time
  if (phase === 'quiz' || phase === 'submitting') {
    const q = questions[currentIdx];
    const isLast = currentIdx === questions.length - 1;

    return (
      <div className="bg-white rounded-[2rem] p-8 border-4 border-indigo-100 shadow-[0_8px_0_0_rgba(224,231,255,1)] space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-indigo-400 uppercase tracking-wide">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${i <= currentIdx ? 'bg-indigo-500 w-6' : 'bg-indigo-100 w-3'}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-6 border-2 border-indigo-100">
          <p className="text-lg font-bold text-indigo-900">{q.questionText}</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wide">Your Answer</label>
          <textarea
            value={answers[currentIdx] || ''}
            onChange={e => setAnswers(a => ({ ...a, [currentIdx]: e.target.value }))}
            placeholder="Write your answer here..."
            className="w-full h-36 p-4 rounded-xl border-2 border-indigo-100 bg-white text-indigo-900 placeholder-indigo-300 focus:outline-none focus:border-indigo-400 resize-none"
            disabled={phase === 'submitting'}
          />
        </div>

        {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl">{error}</p>}

        <div className="flex gap-3">
          {currentIdx > 0 && (
            <button
              onClick={() => setCurrentIdx(i => i - 1)}
              className="bg-indigo-50 text-indigo-700 font-bold py-3 px-6 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              ← Back
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setCurrentIdx(i => i + 1)}
              className="flex-grow bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submitAnswers}
              disabled={phase === 'submitting'}
              className="flex-grow bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {phase === 'submitting' ? (
                <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" /> Grading...</>
              ) : (
                <><Send className="w-4 h-4" /> Submit &amp; Grade</>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // RESULTS screen
  if (phase === 'results') {
    const totalScore = results.reduce((s, r) => s + (r.score ?? 0), 0);
    const maxScore = results.length * 5;
    const pct = Math.round(scorePct ?? 0);

    return (
      <div className="space-y-6">
        {/* Score banner */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-8 text-white text-center shadow-[0_8px_0_0_rgba(79,70,229,0.5)]">
          <p className="text-lg font-bold opacity-80 mb-1">Your Score</p>
          <p className="text-7xl font-black font-['Baloo_2']">{pct}%</p>
          <p className="opacity-80 mt-1">{totalScore} / {maxScore} points</p>
        </div>

        {/* Per-question results */}
        <div className="space-y-4">
          {results.map((r, i) => {
            const score = r.score ?? 0;
            const isGood = score >= 3;
            return (
              <div
                key={i}
                className={`bg-white rounded-2xl p-6 border-2 ${isGood ? 'border-green-100' : 'border-red-100'} shadow-sm`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="font-bold text-indigo-900 flex-1">{r.questionText}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ScoreStars score={score} />
                    <span className={`text-sm font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}>
                      {score}/5
                    </span>
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 mb-2">
                  <p className="text-xs font-bold text-indigo-400 mb-1">YOUR ANSWER</p>
                  <p className="text-sm text-indigo-900">{r.userAnswer || <em className="text-indigo-300">No answer given</em>}</p>
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
        </div>

        <button
          onClick={() => { setPhase('idle'); setResults([]); setScorePct(null); }}
          className="w-full bg-indigo-50 text-indigo-700 font-bold py-4 px-6 rounded-2xl hover:bg-indigo-100 transition-colors"
        >
          Take Another Test
        </button>
      </div>
    );
  }

  return null;
}
