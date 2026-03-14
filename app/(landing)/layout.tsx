import { ReactNode } from "react"

import { MarketingFooter } from "@/components/marketing-footer"
import { MarketingHeader } from "@/components/marketing-header"
import { getCurrentUser } from "@/lib/auth"

export default async function LandingLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader user={user} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
