import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadDocument } from '@/lib/storage'
import { processDocuments } from '@/lib/processDocuments'

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser()
    if (!auth.user) {
      return auth.response
    }

    const formData = await request.formData()
    const title = formData.get('title') as string
    const prompt = formData.get('prompt') as string
    const files = formData.getAll('files') as File[]

    if (!title || !prompt || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const palace = await prisma.palace.create({
      data: {
        userId: auth.user.id,
        title,
        prompt,
        status: 'processing'
      }
    })

    // 2. Upload documents and create Document records
    const docPromises = files.map(async (file) => {
      const storageUrl = await uploadDocument(file, palace.id)
      
      const fileType = file.name.split('.').pop()?.toLowerCase() || 'txt'
      
      return prisma.document.create({
        data: {
          palaceId: palace.id,
          fileName: file.name,
          fileType: fileType,
          storageUrl: storageUrl,
          processingStatus: 'pending'
        }
      })
    })

    await Promise.all(docPromises)

    // 3. Trigger processing in background (don't await)
    processDocuments(palace.id).catch(console.error)

    return NextResponse.json({ palaceId: palace.id })
  } catch (error) {
    console.error('Error in POST /api/palaces:', error)
    return NextResponse.json({ error: 'Failed to create palace' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const auth = await requireApiUser()
    if (!auth.user) {
      return auth.response
    }
    
    const palaces = await prisma.palace.findMany({
      where: { userId: auth.user.id },
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
    
    return NextResponse.json({ palaces })
  } catch (error) {
    console.error('Error in GET /api/palaces:', error)
    return NextResponse.json({ error: 'Failed to fetch palaces' }, { status: 500 })
  }
}
