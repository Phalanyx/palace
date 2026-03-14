import { GoogleGenAI } from '@google/genai'

export const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || '',
  location: process.env.GCP_LOCATION || 'us-central1',
})
