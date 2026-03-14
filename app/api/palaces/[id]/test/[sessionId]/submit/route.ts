import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

export async function POST(request: Request, context: any) {
  try {
    const params = await context.params
    const { sessionId } = params
    const body = await request.json()
    const { answers, gradingInstructions } = body as {
      answers: { objectId: string; questionText: string; correctAnswer: string; userAnswer: string }[]
      gradingInstructions: string
    }

    const gradedItems = await Promise.all(
      answers.map(async (a) => {
        const prompt = `
You are grading a student's written answer for a memory palace quiz.
Grading instructions: "${gradingInstructions}"

Question: ${a.questionText}
Reference answer: ${a.correctAnswer}
Student answer: ${a.userAnswer || '(no answer given)'}

Grade this answer on a scale of 0-5 where:
  5 = excellent, demonstrates full understanding
  4 = good, minor gaps
  3 = adequate, partial understanding
  2 = limited understanding
  1 = minimal relevant content
  0 = no answer or completely wrong

Respond ONLY as valid JSON, no markdown:
{
  "score": <integer 0-5>,
  "feedback": "<1-2 sentence specific feedback explaining the score>"
}
`
        let score = 0
        let feedback = 'Could not grade this answer.'
        try {
          const resp = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          })
          let raw = resp.text?.trim() || ''
          // Strip markdown code fences if present
          raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
          const parsed = JSON.parse(raw)
          score = Math.min(5, Math.max(0, parseInt(parsed.score) || 0))
          feedback = parsed.feedback || feedback
        } catch (e) {
          console.error('Grading error for question:', a.questionText, e)
        }
        return { ...a, score, feedback }
      })
    )

    // Compute score percentage (sum of scores / max possible)
    const totalScore = gradedItems.reduce((s, g) => s + (g.score ?? 0), 0)
    const maxScore = gradedItems.length * 5
    const scorePct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

    // Update session with graded results
    await prisma.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        correctAnswers: gradedItems.filter(g => (g.score ?? 0) >= 3).length,
        scorePct,
        completedAt: new Date(),
        questions: {
          gradingInstructions,
          items: gradedItems.map(g => ({
            objectId: g.objectId,
            questionText: g.questionText,
            correctAnswer: g.correctAnswer,
            userAnswer: g.userAnswer,
            score: g.score,
            aiFeedback: g.feedback,
          }))
        } as any,
      }
    })

    return NextResponse.json({ gradedItems, scorePct, totalScore, maxScore })
  } catch (error: any) {
    console.error('Error grading test session:', error)
    return NextResponse.json({ error: error.message || 'Failed to grade' }, { status: 500 })
  }
}
