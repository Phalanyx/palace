import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, BrainCircuit, CalendarClock, FileText, GalleryVerticalEnd, Sparkles, Trophy } from "lucide-react"

import TestHistory from "../TestHistory"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { computeMetrics, getWeakAreas, normalizeSession } from "./analytics"

export const dynamic = "force-dynamic"

function formatMetric(value: number | null, digits = 0) {
  if (value === null) {
    return "No data"
  }

  return `${value.toFixed(digits)}%`
}

function formatDate(value: string | null) {
  if (!value) {
    return "No completed tests yet"
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function trendLabel(direction: ReturnType<typeof computeMetrics>["trendDirection"]) {
  if (direction === "improving") return "Improving"
  if (direction === "declining") return "Declining"
  if (direction === "steady") return "Steady"
  return "Building baseline"
}

export default async function HistoryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await requireUser()

  const palace = await prisma.palace.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: {
      documents: {
        select: { fileName: true },
      },
      _count: {
        select: {
          rooms: true,
          documents: true,
        },
      },
      testSessions: {
        orderBy: { startedAt: "desc" },
      },
    },
  })

  if (!palace) {
    notFound()
  }

  const sessions = palace.testSessions.map(normalizeSession)
  const metrics = computeMetrics(sessions)
  const weakAreas = getWeakAreas(sessions)
  const sources = palace.documents.map((document) => document.fileName).filter(Boolean)

  return (
    <div className="glass-page min-h-screen font-sans text-foreground">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top left, color-mix(in srgb, var(--dashboard-accent) 22%, transparent), transparent 36%), radial-gradient(circle at top right, color-mix(in srgb, var(--dashboard-surface-alt) 92%, transparent), transparent 42%)",
          }}
        />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" className="border-border/80 bg-background/50 backdrop-blur-xl">
              <Link href={`/palace/${palace.id}`}>
                <ArrowLeft data-icon="inline-start" />
                Back to palace
              </Link>
            </Button>
            <Button asChild className="shadow-[0_12px_32px_rgba(75,139,102,0.2)]">
              <Link href={`/palace/${palace.id}`}>
                Resume palace
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
            <Card className="dashboard-panel rounded-[30px] border-border/80 bg-transparent py-0">
              <CardHeader className="gap-4 border-b border-border/70 px-6 py-6 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-3">
                    <Badge
                      variant="secondary"
                      className="h-auto rounded-full border border-border/70 bg-[color:color-mix(in_srgb,var(--dashboard-surface-alt)_90%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--dashboard-accent)]"
                    >
                      <BrainCircuit />
                      Memory palace summary
                    </Badge>
                    <div className="flex flex-col gap-2">
                      <CardTitle className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                        {palace.title}
                      </CardTitle>
                      <CardDescription className="max-w-3xl text-base leading-relaxed text-[color:var(--dashboard-text-muted)]">
                        {palace.prompt}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
                    <div className="dashboard-surface rounded-2xl px-4 py-4">
                      <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                        Latest score
                      </div>
                      <div className="mt-2 text-3xl font-semibold">{formatMetric(metrics.latestScore)}</div>
                      <div className="dashboard-text-soft mt-1 text-sm">
                        {formatDate(metrics.lastTestedAt)}
                      </div>
                    </div>
                    <div className="dashboard-surface rounded-2xl px-4 py-4">
                      <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                        Trend
                      </div>
                      <div className="mt-2 text-3xl font-semibold">{trendLabel(metrics.trendDirection)}</div>
                      <div className="dashboard-text-soft mt-1 text-sm">
                        {metrics.trendDelta === null
                          ? "Need more completed tests"
                          : `${metrics.trendDelta > 0 ? "+" : ""}${metrics.trendDelta.toFixed(1)} pts vs prior window`}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8 xl:grid-cols-4">
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                    Average score
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{formatMetric(metrics.averageScore, 1)}</div>
                </div>
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                    Best score
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{formatMetric(metrics.bestScore)}</div>
                </div>
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                    Current streak
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-2xl font-semibold">{metrics.currentStreakDays}</span>
                    <span className="dashboard-text-soft pb-1 text-sm">day{metrics.currentStreakDays === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="dashboard-heading-kicker text-[10px] font-semibold uppercase tracking-[0.24em]">
                    Completed tests
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{metrics.completedTests}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-panel rounded-[30px] border-border/80 bg-transparent py-0">
              <CardHeader className="border-b border-border/70 px-6 py-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-[color:var(--dashboard-accent)]" />
                  Coaching snapshot
                </CardTitle>
                <CardDescription className="text-[color:var(--dashboard-text-muted)]">
                  Focus the next review session where the recall signal is weakest.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-6 py-6">
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Trophy className="h-4 w-4 text-[color:var(--dashboard-accent)]" />
                    Summary
                  </div>
                  <p className="dashboard-text-muted mt-2 text-sm leading-relaxed">
                    {metrics.completedTests === 0
                      ? "No completed tests yet. Start one from the palace to establish a retention baseline."
                      : metrics.trendDirection === "improving"
                        ? "Recent sessions are trending upward. Keep review intervals tight while the gains are compounding."
                        : metrics.trendDirection === "declining"
                          ? "Recent scores have slipped. Revisit the weakest prompts before the next full test."
                          : metrics.trendDirection === "steady"
                            ? "Recall is stable. Push for a stronger ceiling by revisiting low-scoring prompts."
                            : "You have an initial result. One or two more completed sessions will unlock a real trend line."}
                  </p>
                </div>
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarClock className="h-4 w-4 text-[color:var(--dashboard-accent)]" />
                    Last tested
                  </div>
                  <p className="dashboard-text-muted mt-2 text-sm">{formatDate(metrics.lastTestedAt)}</p>
                </div>
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <GalleryVerticalEnd className="h-4 w-4 text-[color:var(--dashboard-accent)]" />
                    Sources
                  </div>
                  <p className="dashboard-text-muted mt-2 text-sm leading-relaxed">
                    {sources.length > 0 ? sources.join(", ") : "No source documents attached"}
                  </p>
                </div>
                <div className="dashboard-surface rounded-2xl px-4 py-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-[color:var(--dashboard-accent)]" />
                    Areas to revisit
                  </div>
                  {weakAreas.length > 0 ? (
                    <div className="flex flex-col gap-3">
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
                    <p className="dashboard-text-muted text-sm leading-relaxed">
                      {metrics.completedTests === 0
                        ? "Weak-area analysis will appear after the first graded session."
                        : "No repeated weak prompts detected yet."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <TestHistory
            palaceId={palace.id}
            palaceTitle={palace.title}
            roomCount={palace._count.rooms}
            documentCount={palace._count.documents}
            sessions={sessions}
          />
        </div>
      </div>
    </div>
  )
}
