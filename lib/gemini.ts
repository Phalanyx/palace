import { GoogleGenAI } from '@google/genai'

export const ai = new GoogleGenAI({
  apiKey: process.env.VERTEX_AI_KEY
})
