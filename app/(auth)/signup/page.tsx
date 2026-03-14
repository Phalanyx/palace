import { AuthRoutePage } from "@/components/auth/auth-route-page"
import { getSafeNextPath } from "@/lib/auth-redirect"

export default async function SignupPage(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const resolvedSearchParams = await props.searchParams
  const nextPath = getSafeNextPath(resolvedSearchParams.next)

  return <AuthRoutePage mode="signup" nextPath={nextPath} />
}
