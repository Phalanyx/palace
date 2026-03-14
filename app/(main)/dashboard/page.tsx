import DashboardClient from "@/app/dashboard/DashboardClient"
import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await requireUser()

  const palaces = await prisma.palace.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { rooms: true },
      },
      testSessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return <DashboardClient initialPalaces={palaces} userEmail={user.email ?? ""} />
}
