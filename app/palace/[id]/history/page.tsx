import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, FileText, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import TestHistory from '../TestHistory';

export const dynamic = 'force-dynamic';

export default async function HistoryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const palace = await prisma.palace.findUnique({
    where: { id: params.id },
    include: { documents: true },
  });

  if (!palace) notFound();

  return (
    <div className="min-h-screen bg-[#EEF2FF] p-6 font-['Comic_Neue'] text-lg">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/palace/${palace.id}`}
            className="group flex items-center gap-2 bg-white px-5 py-3 rounded-full font-bold text-indigo-700 shadow-[0_4px_0_0_rgba(224,231,255,1)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_rgba(224,231,255,1)] transition-all"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Palace
          </Link>
        </div>

        {/* Title */}
        <div className="bg-white rounded-[2rem] p-8 border-4 border-white shadow-[0_8px_0_0_rgba(224,231,255,1)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-indigo-50 opacity-40 rotate-12">
            <BrainCircuit size={160} />
          </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black text-indigo-950 font-['Baloo_2'] tracking-tight">{palace.title}</h1>
            <p className="text-indigo-500 font-medium mt-1">{palace.prompt}</p>
          </div>
        </div>

        {/* Sources */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-8 shadow-[0_8px_0_0_rgba(79,70,229,0.5)] text-white relative overflow-hidden">
          <div className="absolute right-[-20%] top-[-50%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <h2 className="text-2xl font-black font-['Baloo_2'] mb-2 flex items-center gap-3">
            <FileText className="opacity-80" /> Sources
          </h2>
          <p className="opacity-90 font-medium">
            {palace.documents.map((d: any) => d.fileName).join(', ') || 'No documents attached'}
          </p>
        </div>

        {/* Test History */}
        <TestHistory palaceId={palace.id} />

      </div>
    </div>
  );
}
