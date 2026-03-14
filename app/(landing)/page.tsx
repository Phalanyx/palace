import Link from "next/link"
import { ArrowRightIcon, BrainCircuitIcon, CastleIcon, SparklesIcon } from "lucide-react"

import DragonSceneLoader from "@/app/components/DragonSceneLoader"
import { getCurrentUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const highlights = [
  {
    title: "Turn documents into rooms",
    description: "Upload notes, slides, and readings, then generate a palace you can actually walk through.",
    icon: CastleIcon,
  },
  {
    title: "Study with active recall",
    description: "Quiz yourself inside the palace and keep the vivid details attached to each concept.",
    icon: BrainCircuitIcon,
  },
  {
    title: "Keep your flow lightweight",
    description: "Email login and Google SSO get you from landing page to dashboard with almost no friction.",
    icon: SparklesIcon,
  },
]

export default async function HomePage() {
  const user = await getCurrentUser()

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,_#fffdf7_0%,_#eef2ff_45%,_#f8fafc_100%)]">
      <div className="absolute inset-0 opacity-80">
        <DragonSceneLoader />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(255,255,255,0.58)_34%,_rgba(255,255,255,0.8)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:py-16">
          <div className="flex flex-col gap-6">
            <Badge variant="secondary" className="w-fit rounded-full px-4 py-1">
              AI-generated palaces, quizzes, and recall loops
            </Badge>

            <div className="flex flex-col gap-4">
              <h1 className="max-w-3xl font-[family-name:var(--font-baloo)] text-5xl leading-none text-foreground sm:text-6xl lg:text-7xl">
                Make studying feel like exploring a story world.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Palace transforms your source material into interactive memory rooms so your notes stop feeling flat and start feeling memorable.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-11 rounded-2xl"
                render={<Link href={user ? "/dashboard" : "/signup"} />}
                nativeButton={false}
              >
                {user ? "Continue learning" : "Start with email"}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 rounded-2xl bg-white/75"
                render={<Link href={user ? "/dashboard" : "/login"} />}
                nativeButton={false}
              >
                {user ? "Open dashboard" : "I already have an account"}
              </Button>
            </div>

            <div id="highlights" className="grid gap-4 sm:grid-cols-3">
              {highlights.map(({ title, description, icon: Icon }) => (
                <Card key={title} className="border-border/60 bg-card/85 shadow-xl backdrop-blur">
                  <CardHeader className="gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon />
                    </div>
                    <CardTitle className="font-[family-name:var(--font-baloo)] text-2xl">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-7">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card id="how-it-works" className="self-end border-border/60 bg-card/90 shadow-2xl backdrop-blur">
            <CardHeader className="gap-3">
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                What you get
              </Badge>
              <CardTitle className="font-[family-name:var(--font-baloo)] text-3xl">
                A playful front door into the product.
              </CardTitle>
              <CardDescription className="text-base leading-7">
                Keep the dragon energy up front, then move directly into secure auth and your personal dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5 rounded-full">1</Badge>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">Sign in your way</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Use email/password or Google SSO without leaving the flow.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5 rounded-full">2</Badge>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">Own your palaces</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Every palace, room, and test session is scoped to the authenticated user.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5 rounded-full">3</Badge>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">Jump back in fast</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Returning users skip straight from the landing page to the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </section>
  )
}
