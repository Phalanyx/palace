'use client'

import type { ComponentType } from "react"
import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, ClipboardList, Flame, Layers3, LineChart, NotebookText, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/glass/tabs"
import { buildTrendPoints, computeMetrics, filterSessionsByRange, getWeakAreas, type PalaceSessionReview } from "./history/analytics"

type RangeValue = "7d" | "30d" | "90d" | "all"

interface TestHistoryProps {
  palaceId: string
  palaceTitle: string
  roomCount: number
  documentCount: number
  sessions: PalaceSessionReview[]
}

interface ScoreCardProps {
  label: string
  value: string
  hint: string
  icon: ComponentType<{ className?: string }>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatPercent(value: number | null, digits = 0) {
  return value === null ? "No data" : `${value.toFixed(digits)}%`
}

function ScoreStars({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={score >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
        />
      ))}
    </span>
  )
}

function ScoreCard({ label, value, hint, icon: Icon }: ScoreCardProps) {
  return (
    <div className="dashboard-surface rounded-2xl px-4 py-4">
      <div className="dashboard-heading-kicker flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em]">
        <Icon className="h-4 w-4 text-[color:var(--dashboard-accent)]" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="dashboard-text-soft mt-1 text-sm">{hint}</div>
    </div>
  )
}

function TrendChart({ points }: { points: ReturnType<typeof buildTrendPoints> }) {
  if (points.length === 0) {
    return (
      <div className="dashboard-surface flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-border/80 px-6 py-8 text-center">
        <div className="flex max-w-sm flex-col gap-2">
          <div className="text-sm font-medium text-foreground">No completed tests in this range</div>
          <div className="dashboard-text-muted text-sm">
            Start a new test from the palace to establish your first retention datapoint.
          </div>
        </div>
      </div>
    )
  }

  const width = 720
  const height = 220
  const paddingX = 20
  const paddingY = 24
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const maxIndex = Math.max(points.length - 1, 1)

  const path = points
    .map((point, index) => {
      const x = paddingX + (index / maxIndex) * innerWidth
      const y = paddingY + ((100 - point.scorePct) / 100) * innerHeight
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  return (
    <div className="dashboard-surface rounded-[28px] px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Score trend</div>
          <div className="dashboard-text-soft text-sm">Completed sessions ordered over time</div>
        </div>
        <Badge variant="outline" className="rounded-full border-border/70 bg-background/40">
          {points.length} point{points.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        {[0, 25, 50, 75, 100].map((label) => {
          const y = paddingY + ((100 - label) / 100) * innerHeight

          return (
            <g key={label}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="color-mix(in srgb, var(--dashboard-border) 92%, transparent)"
                strokeDasharray="4 8"
              />
              <text
                x={width - paddingX}
                y={y - 6}
                textAnchor="end"
                className="fill-[color:var(--dashboard-text-soft)] text-[11px]"
              >
                {label}%
              </text>
            </g>
          )
        })}

        <path
          d={path}
          fill="none"
          stroke="var(--dashboard-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const x = paddingX + (index / maxIndex) * innerWidth
          const y = paddingY + ((100 - point.scorePct) / 100) * innerHeight

          return (
            <g key={point.sessionId}>
              <circle cx={x} cy={y} r="5.5" fill="var(--dashboard-surface-strong)" stroke="var(--dashboard-accent)" strokeWidth="2.5" />
              <text
                x={x}
                y={height - 8}
                textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                className="fill-[color:var(--dashboard-text-soft)] text-[11px]"
              >
                {formatDate(point.date)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SessionCard({ session }: { session: PalaceSessionReview }) {
  const [open, setOpen] = useState(false)
  const pct = Math.round(session.scorePct ?? 0)
  const scoreTone =
    session.status !== "completed"
      ? "text-[color:var(--dashboard-text-soft)]"
      : pct >= 75
        ? "text-emerald-600 dark:text-emerald-400"
        : pct >= 50
          ? "text-amber-600 dark:text-amber-400"
          : "text-rose-600 dark:text-rose-400"

  return (
    <Card className="dashboard-panel rounded-[26px] border-border/80 bg-transparent py-0">
      <CardHeader className="px-0 py-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-background/30"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className={`min-w-[72px] text-3xl font-semibold ${scoreTone}`}>
              {session.status === "completed" ? `${pct}%` : "In progress"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">
                {formatDateTime(session.completedAt ?? session.startedAt)}
              </div>
              <div className="dashboard-text-soft mt-1 text-sm">
                {session.items.length} question{session.items.length === 1 ? "" : "s"} • {session.correctAnswers}/{session.totalQuestions} adequate or better
              </div>
            </div>
          </div>
          {open ? <ChevronUp className="h-5 w-5 text-[color:var(--dashboard-text-soft)]" /> : <ChevronDown className="h-5 w-5 text-[color:var(--dashboard-text-soft)]" />}
        </button>
      </CardHeader>
      {open ? (
        <CardContent className="border-t border-border/70 px-5 py-5">
          <div className="flex flex-col gap-4">
            {session.gradingInstructions ? (
              <div className="dashboard-surface rounded-2xl px-4 py-4">
                <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                  Grading instructions
                </div>
                <p className="dashboard-text-muted mt-2 text-sm leading-relaxed">{session.gradingInstructions}</p>
              </div>
            ) : null}

            {session.items.length === 0 ? (
              <div className="dashboard-surface rounded-2xl border border-dashed border-border/80 px-4 py-6 text-center text-sm text-[color:var(--dashboard-text-muted)]">
                No graded answers were stored for this session.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {session.items.map((item, index) => {
                  const score = item.score ?? 0

                  return (
                    <div key={`${session.id}-${index}`} className="dashboard-surface rounded-2xl px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground">{item.questionText}</div>
                          {item.correctAnswer ? (
                            <div className="dashboard-text-soft mt-1 text-xs leading-relaxed">
                              Reference: {item.correctAnswer}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <ScoreStars score={score} />
                          <span className="text-xs font-medium text-[color:var(--dashboard-text-soft)]">
                            {score}/5
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-border/70 bg-background/50 px-3 py-3">
                          <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                            Your answer
                          </div>
                          <p className="dashboard-text-muted mt-2 text-sm leading-relaxed">
                            {item.userAnswer || "No answer provided."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/50 px-3 py-3">
                          <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                            AI feedback
                          </div>
                          <p className="dashboard-text-muted mt-2 text-sm leading-relaxed">
                            {item.aiFeedback || "No feedback stored."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

export default function TestHistory({
  palaceId,
  palaceTitle,
  roomCount,
  documentCount,
  sessions,
}: TestHistoryProps) {
  const [range, setRange] = useState<RangeValue>("30d")

  const visibleSessions = useMemo(() => filterSessionsByRange(sessions, range), [range, sessions])
  const metrics = useMemo(() => computeMetrics(visibleSessions), [visibleSessions])
  const weakAreas = useMemo(() => getWeakAreas(visibleSessions), [visibleSessions])
  const trendPoints = useMemo(() => buildTrendPoints(visibleSessions), [visibleSessions])

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.85fr)]">
      <div className="flex flex-col gap-6">
        <Card className="dashboard-panel rounded-[30px] border-border/80 bg-transparent py-0">
          <CardHeader className="flex flex-col gap-4 border-b border-border/70 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <LineChart className="h-5 w-5 text-[color:var(--dashboard-accent)]" />
                  Progress over time
                </CardTitle>
                <CardDescription className="mt-1 text-[color:var(--dashboard-text-muted)]">
                  {palaceTitle} • {roomCount} rooms • {documentCount} documents
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full border-border/70 bg-background/40">
                Palace ID: {palaceId.slice(0, 8)}
              </Badge>
            </div>
            <Tabs value={range} onValueChange={(value) => setRange(value as RangeValue)} className="gap-4">
              <TabsList className="h-auto rounded-full p-1">
                <TabsTrigger value="7d" className="rounded-full px-4 text-xs">
                  7d
                </TabsTrigger>
                <TabsTrigger value="30d" className="rounded-full px-4 text-xs">
                  30d
                </TabsTrigger>
                <TabsTrigger value="90d" className="rounded-full px-4 text-xs">
                  90d
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-full px-4 text-xs">
                  All time
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ScoreCard
                label="Latest score"
                value={formatPercent(metrics.latestScore)}
                hint={metrics.lastTestedAt ? formatDateTime(metrics.lastTestedAt) : "No completed sessions"}
                icon={ClipboardList}
              />
              <ScoreCard
                label="Average"
                value={formatPercent(metrics.averageScore, 1)}
                hint={`${metrics.completedTests} completed test${metrics.completedTests === 1 ? "" : "s"} in range`}
                icon={NotebookText}
              />
              <ScoreCard
                label="Best"
                value={formatPercent(metrics.bestScore)}
                hint={
                  metrics.trendDelta === null
                    ? "Need more sessions for comparison"
                    : `${metrics.trendDelta > 0 ? "+" : ""}${metrics.trendDelta.toFixed(1)} pts vs prior block`
                }
                icon={LineChart}
              />
              <ScoreCard
                label="Streak"
                value={`${metrics.currentStreakDays} day${metrics.currentStreakDays === 1 ? "" : "s"}`}
                hint="Consecutive days with at least one completed test"
                icon={Flame}
              />
            </div>

            <TrendChart points={trendPoints} />
          </CardContent>
        </Card>

        <Card className="dashboard-panel rounded-[30px] border-border/80 bg-transparent py-0">
          <CardHeader className="border-b border-border/70 px-6 py-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardList className="h-5 w-5 text-[color:var(--dashboard-accent)]" />
              Session history
            </CardTitle>
            <CardDescription className="text-[color:var(--dashboard-text-muted)]">
              Review individual attempts, scoring, and feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6 py-6">
            {visibleSessions.length === 0 ? (
              <div className="dashboard-surface rounded-[28px] border border-dashed border-border/80 px-6 py-10 text-center">
                <div className="text-base font-medium text-foreground">No sessions in this range</div>
                <div className="dashboard-text-muted mt-2 text-sm">
                  Expand the range or complete a new test from the palace.
                </div>
              </div>
            ) : (
              visibleSessions.map((session) => <SessionCard key={session.id} session={session} />)
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-panel rounded-[30px] border-border/80 bg-transparent py-0">
        <CardHeader className="border-b border-border/70 px-6 py-6">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Layers3 className="h-5 w-5 text-[color:var(--dashboard-accent)]" />
            Range insights
          </CardTitle>
          <CardDescription className="text-[color:var(--dashboard-text-muted)]">
            Derived from the currently selected time window.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6 py-6">
          <div className="dashboard-surface rounded-2xl px-4 py-4">
            <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
              Trend status
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {metrics.trendDirection === "improving"
                ? "Improving"
                : metrics.trendDirection === "declining"
                  ? "Declining"
                  : metrics.trendDirection === "steady"
                    ? "Steady"
                    : "Insufficient data"}
            </div>
            <p className="dashboard-text-muted mt-2 text-sm leading-relaxed">
              {metrics.trendDirection === "improving"
                ? "Recent sessions are outperforming the prior block."
                : metrics.trendDirection === "declining"
                  ? "Recent sessions fell below the prior block. Revisit weak prompts before the next full run."
                  : metrics.trendDirection === "steady"
                    ? "Performance is holding steady across the selected range."
                    : "Complete at least a few graded sessions to unlock a directional trend."}
            </p>
          </div>

          <div className="dashboard-surface rounded-2xl px-4 py-4">
            <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
              Weak areas
            </div>
            {weakAreas.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3">
                {weakAreas.map((area) => (
                  <div key={area.key} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-3">
                    <div className="text-sm font-medium text-foreground">{area.label}</div>
                    <div className="dashboard-text-soft mt-1 text-xs">
                      {area.lowScoreCount} low-score review{area.lowScoreCount === 1 ? "" : "s"} • avg {area.averageScore.toFixed(1)}/5
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-text-muted mt-2 text-sm leading-relaxed">
                No repeated weak prompts were detected in this window.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
