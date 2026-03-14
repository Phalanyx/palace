import { LandingPageClient } from "@/components/landing/landing-page-client"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const code = typeof resolvedSearchParams.code === "string" ? resolvedSearchParams.code : null

  if (code) {
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === "string") {
        params.set(key, value)
      } else if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry))
      }
    }

    redirect(`/auth/callback?${params.toString()}`)
  }

  const user = await getCurrentUser()

  return <LandingPageClient user={user} />
}
