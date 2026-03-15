import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePalaceAccess } from '@/lib/auth'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const palaceId = params.id
    const auth = await requirePalaceAccess(palaceId)

    if (auth.response) {
      return auth.response
    }

    const sessions = await prisma.testSession.findMany({
      where: { palaceId },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sessions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
