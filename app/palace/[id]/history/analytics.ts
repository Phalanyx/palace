export interface PalaceQuestionReview {
  objectId: string | null
  questionText: string
  correctAnswer: string
  userAnswer: string
  score: number | null
  aiFeedback: string
}

export interface PalaceSessionReview {
  id: string
  status: string
  totalQuestions: number
  correctAnswers: number
  scorePct: number | null
  startedAt: string
  completedAt: string | null
  gradingInstructions: string | null
  items: PalaceQuestionReview[]
}

export interface WeakArea {
  key: string
  label: string
  lowScoreCount: number
  averageScore: number
}

export interface PalaceMetrics {
  latestScore: number | null
  averageScore: number | null
  bestScore: number | null
  completedTests: number
  currentStreakDays: number
  lastTestedAt: string | null
  trendDirection: "improving" | "steady" | "declining" | "insufficient_data"
  trendDelta: number | null
}

export interface PalaceTrendPoint {
  sessionId: string
  date: string
  scorePct: number
}

type SessionLike = {
  id: string
  status: string
  totalQuestions: number
  correctAnswers: number
  scorePct: number | null
  startedAt: Date | string
  completedAt: Date | string | null
  questions: unknown
}

function toReviewItem(item: unknown): PalaceQuestionReview | null {
  if (!item || typeof item !== "object") {
    return null
  }

  const record = item as Record<string, unknown>
  const questionText = typeof record.questionText === "string" ? record.questionText : ""

  if (!questionText) {
    return null
  }

  return {
    objectId: typeof record.objectId === "string" ? record.objectId : null,
    questionText,
    correctAnswer: typeof record.correctAnswer === "string" ? record.correctAnswer : "",
    userAnswer: typeof record.userAnswer === "string" ? record.userAnswer : "",
    score: typeof record.score === "number" ? record.score : null,
    aiFeedback: typeof record.aiFeedback === "string" ? record.aiFeedback : "",
  }
}

export function normalizeQuestions(
  questions: unknown
): Pick<PalaceSessionReview, "gradingInstructions" | "items"> {
  if (Array.isArray(questions)) {
    return {
      gradingInstructions: null,
      items: questions.map(toReviewItem).filter((item): item is PalaceQuestionReview => item !== null),
    }
  }

  if (questions && typeof questions === "object") {
    const payload = questions as { gradingInstructions?: unknown; items?: unknown }

    return {
      gradingInstructions:
        typeof payload.gradingInstructions === "string" ? payload.gradingInstructions : null,
      items: Array.isArray(payload.items)
        ? payload.items.map(toReviewItem).filter((item): item is PalaceQuestionReview => item !== null)
        : [],
    }
  }

  return {
    gradingInstructions: null,
    items: [],
  }
}

export function normalizeSession(session: SessionLike): PalaceSessionReview {
  const normalized = normalizeQuestions(session.questions)

  return {
    id: session.id,
    status: session.status,
    totalQuestions: session.totalQuestions,
    correctAnswers: session.correctAnswers,
    scorePct: session.scorePct,
    startedAt: new Date(session.startedAt).toISOString(),
    completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    gradingInstructions: normalized.gradingInstructions,
    items: normalized.items,
  }
}

export function getCompletedSessions(sessions: PalaceSessionReview[]) {
  return sessions.filter((session) => session.status === "completed" && session.scorePct !== null)
}

export function filterSessionsByRange(
  sessions: PalaceSessionReview[],
  range: "7d" | "30d" | "90d" | "all"
) {
  if (range === "all") {
    return sessions
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))

  return sessions.filter((session) => {
    const stamp = session.completedAt ?? session.startedAt
    return new Date(stamp) >= cutoff
  })
}

function calculateTrend(completedSessions: PalaceSessionReview[]) {
  if (completedSessions.length < 2) {
    return {
      trendDirection: "insufficient_data" as const,
      trendDelta: null,
    }
  }

  const descending = [...completedSessions].sort(
    (a, b) => new Date(b.completedAt ?? b.startedAt).getTime() - new Date(a.completedAt ?? a.startedAt).getTime()
  )
  const recent = descending.slice(0, 3)
  const previous = descending.slice(3, 6)

  if (recent.length === 0 || previous.length === 0) {
    return {
      trendDirection: "insufficient_data" as const,
      trendDelta: null,
    }
  }

  const recentAverage = recent.reduce((sum, session) => sum + (session.scorePct ?? 0), 0) / recent.length
  const previousAverage =
    previous.reduce((sum, session) => sum + (session.scorePct ?? 0), 0) / previous.length
  const trendDelta = recentAverage - previousAverage

  if (trendDelta > 3) {
    return { trendDirection: "improving" as const, trendDelta }
  }

  if (trendDelta < -3) {
    return { trendDirection: "declining" as const, trendDelta }
  }

  return { trendDirection: "steady" as const, trendDelta }
}

function calculateCurrentStreak(completedSessions: PalaceSessionReview[]) {
  if (completedSessions.length === 0) {
    return 0
  }

  const dayKeys = new Set(
    completedSessions.map((session) => {
      const date = new Date(session.completedAt ?? session.startedAt)
      return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
      ].join("-")
    })
  )

  const anchor = new Date()
  anchor.setUTCHours(0, 0, 0, 0)

  const todayKey = [
    anchor.getUTCFullYear(),
    String(anchor.getUTCMonth() + 1).padStart(2, "0"),
    String(anchor.getUTCDate()).padStart(2, "0"),
  ].join("-")

  if (!dayKeys.has(todayKey)) {
    anchor.setUTCDate(anchor.getUTCDate() - 1)
    const yesterdayKey = [
      anchor.getUTCFullYear(),
      String(anchor.getUTCMonth() + 1).padStart(2, "0"),
      String(anchor.getUTCDate()).padStart(2, "0"),
    ].join("-")

    if (!dayKeys.has(yesterdayKey)) {
      return 0
    }
  }

  let streak = 0

  while (true) {
    const key = [
      anchor.getUTCFullYear(),
      String(anchor.getUTCMonth() + 1).padStart(2, "0"),
      String(anchor.getUTCDate()).padStart(2, "0"),
    ].join("-")

    if (!dayKeys.has(key)) {
      break
    }

    streak += 1
    anchor.setUTCDate(anchor.getUTCDate() - 1)
  }

  return streak
}

export function computeMetrics(sessions: PalaceSessionReview[]): PalaceMetrics {
  const completedSessions = getCompletedSessions(sessions)
  const latest = completedSessions[0] ?? null
  const averageScore =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, session) => sum + (session.scorePct ?? 0), 0) / completedSessions.length
      : null
  const bestScore =
    completedSessions.length > 0
      ? Math.max(...completedSessions.map((session) => session.scorePct ?? 0))
      : null
  const trend = calculateTrend(completedSessions)

  return {
    latestScore: latest?.scorePct ?? null,
    averageScore,
    bestScore,
    completedTests: completedSessions.length,
    currentStreakDays: calculateCurrentStreak(completedSessions),
    lastTestedAt: latest?.completedAt ?? latest?.startedAt ?? null,
    trendDirection: trend.trendDirection,
    trendDelta: trend.trendDelta,
  }
}

export function buildTrendPoints(sessions: PalaceSessionReview[]): PalaceTrendPoint[] {
  return getCompletedSessions(sessions)
    .slice()
    .reverse()
    .map((session) => ({
      sessionId: session.id,
      date: session.completedAt ?? session.startedAt,
      scorePct: session.scorePct ?? 0,
    }))
}

export function getWeakAreas(sessions: PalaceSessionReview[]): WeakArea[] {
  const aggregate = new Map<string, { label: string; totalScore: number; attempts: number; lowScoreCount: number }>()

  for (const session of getCompletedSessions(sessions)) {
    for (const item of session.items) {
      if (item.score === null) {
        continue
      }

      const key = item.objectId ?? item.questionText
      const entry = aggregate.get(key) ?? {
        label: item.questionText,
        totalScore: 0,
        attempts: 0,
        lowScoreCount: 0,
      }

      entry.totalScore += item.score
      entry.attempts += 1

      if (item.score < 3) {
        entry.lowScoreCount += 1
      }

      aggregate.set(key, entry)
    }
  }

  return Array.from(aggregate.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      lowScoreCount: value.lowScoreCount,
      averageScore: value.attempts > 0 ? value.totalScore / value.attempts : 0,
    }))
    .filter((entry) => entry.lowScoreCount > 0)
    .sort((a, b) => {
      if (b.lowScoreCount !== a.lowScoreCount) {
        return b.lowScoreCount - a.lowScoreCount
      }

      return a.averageScore - b.averageScore
    })
    .slice(0, 3)
}
