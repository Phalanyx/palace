import { NextResponse } from 'next/server'
import { requirePalaceAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const palaceId = params.id

    const auth = await requirePalaceAccess(palaceId)
    if (!auth.palace) {
      return auth.response
    }

    const sessions = await prisma.testSession.findMany({
      where: { palaceId },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sessions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
