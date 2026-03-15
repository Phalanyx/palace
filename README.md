# loci

Transform any learning material into an immersive 3D memory palace. Upload documents or describe what you want to learn, and AI generates an interactive medieval palace with themed rooms, unique low-poly 3D objects representing key concepts, a voice-powered AI tutor, and built-in testing.

Built on the ancient **Method of Loci** mnemonic technique — the idea that spatial memory is far more powerful than rote memorization.

## Demo 

[![Watch the demo](https://img.youtube.com/vi/x1QOMcXwfb8/0.jpg)](https://www.youtube.com/watch?v=x1QOMcXwfb8)

## How It Works

1. **Upload or describe** — Drop in PDFs, slides, or text, or just type a topic you want to learn
2. **AI builds your palace** — Gemini analyzes the material, organizes concepts into themed rooms (Library, Great Hall, Dungeon, etc.), and assigns each concept a metaphorical 3D object
3. **Explore in 3D** — Walk through your palace, click objects to review concepts, and interact with an AI companion that knows your material
4. **Test yourself** — Take AI-generated quizzes grounded in your source material with instant feedback

## Features

- **AI-generated 3D objects** — Each concept becomes a unique low-poly Three.js model (a telescope for "exploration," a zipper for "DNA replication," etc.)
- **Voice AI companion** — Real-time voice conversation powered by Gemini Live API; ask questions, get explanations, navigate rooms by voice
- **Semantic search** — Ask "where did we cover X?" and the AI finds the right room and object
- **RAG-powered Q&A** — Chat with any object to get answers grounded in your source documents
- **Spaced repetition testing** — Track scores across sessions to measure retention
- **Pre-built prompt library** — Quick-start templates for medical, legal, STEM, and other domains

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Python 3.10+ (for the voice proxy server)
- A Supabase project
- Google AI Studio API key (for Gemini + Imagen)
- Moorcheh API key (for vector search)

### Setup

```bash
# Install dependencies
pnpm install
pip install -r requirements.txt

# Configure environment
cp .env.example .env.local
# Fill in your keys (see Environment Variables below)

# Set up database
pnpm prisma generate
pnpm prisma db push

# Initialize storage bucket
pnpm run init-bucket

# Start development
pnpm dev                # Next.js on :3000
python server.py        # Voice proxy on :8080 (separate terminal)
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=
DIRECT_URL=

# Google AI
VERTEX_AI_KEY=              # Google AI Studio API key

# Vector Search
MOORCHEH_API_KEY=
MOORCHEH_PREFIX=            # Namespace prefix (e.g. your username)

# Voice Proxy
GCP_PROJECT_ID=
GCP_LOCATION=us-central1
```

## Architecture

```
User uploads docs / enters prompt
        |
        v
  Gemini extracts text & generates palace structure
  (rooms, objects, descriptions, metaphors, questions)
        |
        v
  Gemini 3.1 Pro generates Three.js code for each object (parallel)
  Imagen generates cover art
  Moorcheh indexes document chunks for RAG
        |
        v
  Everything stored: Prisma (structure), Supabase Storage (meshes, images)
        |
        v
  User explores palace in React Three Fiber
  Clicks objects, talks to AI buddy, takes tests
```

## Built With

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, React Three Fiber |
| 3D | Three.js r158 with low-poly flat-shaded aesthetic |
| Styling | TailwindCSS 4, Shadcn/ui |
| Database | PostgreSQL via Supabase, Prisma ORM |
| Storage | Supabase Object Storage |
| AI — Content | Google Gemini 2.5 Flash (structuring, grading, search) |
| AI — Meshes | Google Gemini 3.1 Pro (Three.js code generation) |
| AI — Images | Google Imagen 4.0 (cover art) |
| AI — Voice | Gemini Live API via Python WebSocket proxy |
| Vector Search | Moorcheh SDK (document chunking + semantic retrieval) |
| Auth | Supabase Auth (Google OAuth) |

## License

MIT
