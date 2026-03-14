import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { getSafeNextPath } from "@/lib/auth-redirect"
import { AuthForm } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"

export default async function SignupPage(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const searchParams = await props.searchParams
  const nextPath = getSafeNextPath(searchParams.next)

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(180deg,_#fefce8_0%,_#eef2ff_45%,_#f8fafc_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <section className="flex max-w-xl flex-col gap-6">
          <Button variant="ghost" render={<Link href="/" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to landing page
          </Button>
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
              Start fresh
            </p>
            <h1 className="font-[family-name:var(--font-baloo)] text-5xl leading-none text-foreground">
              Build your first memory palace.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Create an account with email or Google, then turn documents into vivid recall spaces.
            </p>
          </div>
        </section>

        <section className="w-full max-w-md">
          <Suspense>
            <AuthForm mode="signup" nextPath={nextPath} />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
