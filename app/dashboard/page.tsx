import DashboardClient from "./DashboardClient"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// We are defining userId here as "test-user-id" to match the API simulation
export default async function DashboardPage() {
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

  return <DashboardClient initialPalaces={palaces} />
}
