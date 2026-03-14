import { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/app-header"
import { getCurrentUser } from "@/lib/auth"

export default async function MainLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_transparent_28%),linear-gradient(180deg,_#fefce8_0%,_#eef2ff_45%,_#f8fafc_100%)]">
      <AppHeader user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
