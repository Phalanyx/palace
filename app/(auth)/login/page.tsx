import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { getSafeNextPath } from "@/lib/auth-redirect"
import { AuthForm } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const searchParams = await props.searchParams
  const nextPath = getSafeNextPath(searchParams.next)

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(116,87,255,0.20),_transparent_35%),linear-gradient(180deg,_#fef7ff_0%,_#eef2ff_35%,_#fff5f5_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <section className="flex max-w-xl flex-col gap-6">
          <Button variant="ghost" render={<Link href="/" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to landing page
          </Button>
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
              Memory Palace
            </p>
            <h1 className="font-[family-name:var(--font-baloo)] text-5xl leading-none text-foreground">
              Return to your study world.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Log in with email or Google to continue building, testing, and exploring your palaces.
            </p>
          </div>
        </section>

        <section className="w-full max-w-md">
          <Suspense>
            <AuthForm mode="login" nextPath={nextPath} />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
