"use client"

import Link from "next/link"
import { useState } from "react"
import {
  CheckCircle2Icon,
  LoaderCircleIcon,
  PlusIcon,
  SparklesIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

interface PalaceCardData {
  id: string
  title: string
  prompt: string
  status: string
  _count?: {
    rooms: number
  }
  testSessions?: Array<{
    scorePct?: number | null
  }>
}

export default function DashboardClient({
  initialPalaces,
  userEmail,
}: {
  initialPalaces: PalaceCardData[]
  userEmail: string
}) {
  const [palaces, setPalaces] = useState(initialPalaces)
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-background/80 p-5 shadow-xl backdrop-blur md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
            Study studio
          </p>
          <p className="text-lg text-muted-foreground">
            Upload material, generate rooms, and return for active recall whenever you want another pass through the palace.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button onClick={() => setIsNewSheetOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            New palace
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/85 shadow-lg">
          <CardHeader>
            <CardDescription>Total palaces</CardDescription>
            <CardTitle className="font-[family-name:var(--font-baloo)] text-4xl">
              {palaces.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/85 shadow-lg">
          <CardHeader>
            <CardDescription>Ready to explore</CardDescription>
            <CardTitle className="font-[family-name:var(--font-baloo)] text-4xl">
              {palaces.filter((palace) => palace.status === "ready").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/85 shadow-lg">
          <CardHeader>
            <CardDescription>Latest learner</CardDescription>
            <CardTitle className="truncate text-lg">{userEmail}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {palaces.map((palace) => (
          <Card
            key={palace.id}
            className="border-border/60 bg-card/90 shadow-lg transition-transform hover:-translate-y-1"
          >
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <StatusBadge status={palace.status} />
                <Badge variant="outline" className="rounded-full">
                  {palace._count?.rooms || 0} rooms
                </Badge>
              </div>
              <CardTitle className="font-[family-name:var(--font-baloo)] text-3xl">
                {palace.title}
              </CardTitle>
              <CardDescription className="line-clamp-3 text-base leading-7">
                {palace.prompt}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {palace.testSessions?.[0]?.scorePct !== undefined &&
              palace.testSessions?.[0]?.scorePct !== null ? (
                <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Latest score
                  </span>
                  <Badge className="rounded-full">
                    {Math.round(palace.testSessions[0].scorePct)}%
                  </Badge>
                </div>
              ) : (
                <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  No quiz results yet. Enter the palace to start testing recall.
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between gap-3">
              <Button
                variant="outline"
                render={<Link href={`/palace/${palace.id}`} />}
                nativeButton={false}
              >
                Open palace
              </Button>
              <Button
                variant="ghost"
                render={<Link href={`/palace/${palace.id}/history`} />}
                nativeButton={false}
              >
                History
              </Button>
            </CardFooter>
          </Card>
        ))}

        {palaces.length === 0 ? (
          <Card className="border-border/60 bg-card/90 shadow-lg md:col-span-2 xl:col-span-3">
            <CardHeader className="items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
                <SparklesIcon />
              </div>
              <CardTitle className="font-[family-name:var(--font-baloo)] text-4xl">
                No palaces yet
              </CardTitle>
              <CardDescription className="max-w-xl text-base leading-7">
                Upload source material and describe what you want to memorize. The generator will build your first palace from there.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button onClick={() => setIsNewSheetOpen(true)}>
                <UploadCloudIcon data-icon="inline-start" />
                Create your first palace
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </section>

      <NewPalaceSheet
        isOpen={isNewSheetOpen}
        onOpenChange={setIsNewSheetOpen}
        onSuccess={(newPalace) => {
          setPalaces((current) => [newPalace, ...current])
        }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <Badge className="rounded-full">
        <CheckCircle2Icon data-icon="inline-start" />
        Ready
      </Badge>
    )
  }

  if (status === "error") {
    return (
      <Badge variant="destructive" className="rounded-full">
        <XCircleIcon data-icon="inline-start" />
        Error
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="rounded-full">
      <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
      Processing
    </Badge>
  )
}

function NewPalaceSheet({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (palace: PalaceCardData) => void
}) {
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!title || !prompt || files.length === 0) {
      return
    }

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append("title", title)
    formData.append("prompt", prompt)
    files.forEach((file) => formData.append("files", file))

    try {
      const response = await fetch("/api/palaces", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to create palace.")
      }

      const data = await response.json()

      onSuccess({
        id: data.palaceId,
        title,
        prompt,
        status: "processing",
        _count: { rooms: 0 },
        testSessions: [],
      })

      setTitle("")
      setPrompt("")
      setFiles([])
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 border-l border-border sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="font-[family-name:var(--font-baloo)] text-3xl">
            Create a new palace
          </SheetTitle>
          <SheetDescription className="text-base leading-7">
            Upload documents, describe the learning goal, and let the generator assemble the rooms.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="palace-title">Palace title</Label>
            <Input
              id="palace-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. The French Revolution"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="palace-prompt">Learning goal</Label>
            <Textarea
              id="palace-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="What should the palace help you understand and remember?"
              className="min-h-36"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="palace-files">Source documents</Label>
            <Input
              id="palace-files"
              type="file"
              multiple
              accept=".txt,.pdf,.pptx"
              onChange={(event) =>
                setFiles(event.target.files ? Array.from(event.target.files) : [])
              }
            />
            <p className="text-sm text-muted-foreground">
              Accepted formats: `.txt`, `.pdf`, `.pptx`
            </p>
            {files.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4">
                {files.map((file) => (
                  <div key={file.name} className="flex items-center gap-2 text-sm">
                    <UploadCloudIcon />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <SheetFooter className="border-t border-border px-6 py-5">
          <Button
            className="h-11"
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !prompt || files.length === 0}
          >
            {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}
            {isSubmitting ? "Generating palace..." : "Generate palace"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
