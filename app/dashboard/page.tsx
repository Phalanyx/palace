import DashboardClient from "./DashboardClient"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  const palaces = await prisma.palace.findMany({
    where: { userId: "test-user-id" },
    include: {
      _count: {
        select: { rooms: true }
      },
      testSessions: {
        orderBy: { startedAt: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return <DashboardClient initialPalaces={palaces} userEmail={user?.email ?? null} />
}
