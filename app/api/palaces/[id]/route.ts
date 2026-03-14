import { NextResponse } from 'next/server'
import { requirePalaceAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = params.id
    
    const auth = await requirePalaceAccess(id)
    if (!auth.palace) {
      return auth.response
    }

    const palace = await prisma.palace.findFirst({
      where: {
        id,
        userId: auth.user.id,
      },
      include: {
        documents: true,
        rooms: {
          orderBy: { orderIndex: 'asc' as const },
          include: {
            objects: {
              orderBy: { orderIndex: 'asc' as const },
              include: { mesh: true }
            }
          }
        }
      }
    })

    return NextResponse.json({ palace })
  } catch (error) {
    console.error('Error in GET /api/palaces/:id:', error)
    return NextResponse.json({ error: 'Failed to fetch palace' }, { status: 500 })
  }
}
