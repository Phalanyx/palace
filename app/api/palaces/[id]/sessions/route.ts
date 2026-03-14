import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params
    const palaceId = params.id

    const sessions = await prisma.testSession.findMany({
      where: { palaceId },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
