import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, context: any) {
  try {
    const { params } = context
    const id = params.id
    
    const palace = await prisma.palace.findUnique({
      where: { id },
      include: {
        documents: true,
        objects: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    })

    if (!palace) {
      return NextResponse.json({ error: 'Palace not found' }, { status: 404 })
    }

    return NextResponse.json({ palace })
  } catch (error) {
    console.error('Error in GET /api/palaces/:id:', error)
    return NextResponse.json({ error: 'Failed to fetch palace' }, { status: 500 })
  }
}
