import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, BrainCircuit, FileText, Activity } from 'lucide-react';
import Link from 'next/link';
import PalaceRoomView from './PalaceRoomView';
import TestFlow from './TestFlow';

// Dynamically rendered to fetch fresh palace data
export const dynamic = 'force-dynamic';

export default async function PalacePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const palace = await prisma.palace.findUnique({
    where: { id: params.id },
    include: {
      rooms: {
        orderBy: { orderIndex: 'asc' },
        include: {
          objects: {
            orderBy: { orderIndex: 'asc' },
            include: { mesh: true }
          }
        }
      },
      documents: true,
      testSessions: {
        orderBy: { startedAt: 'desc' },
        take: 1
      }
    }
  });

  if (!palace) {
    notFound();
  }

  const latestSession = palace.testSessions[0];

  // Serialize for client component
  const roomsData = palace.rooms.map((room: any) => ({
    id: room.id,
    roomKey: room.roomKey,
    orderIndex: room.orderIndex,
    objects: room.objects.map((obj: any) => ({
      id: obj.id,
      label: obj.label,
      description: obj.description,
      modelKey: obj.modelKey,
      colorHint: obj.colorHint,
      orderIndex: obj.orderIndex,
      sampleQuestion: obj.sampleQuestion,
      metadata: obj.metadata,
      mesh: obj.mesh ? { storageUrl: obj.mesh.storageUrl } : null,
    }))
  }));

  return (
    <div className="min-h-screen bg-[#EEF2FF] p-6 selection:bg-indigo-300 font-['Comic_Neue'] text-lg">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Ribbon */}
        <div className="flex items-center justify-between">
          <Link 
            href="/dashboard"
            className="group flex items-center gap-2 bg-white px-5 py-3 rounded-full font-bold text-indigo-700 shadow-[0_4px_0_0_rgba(224,231,255,1)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_rgba(224,231,255,1)] transition-all"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Hub
          </Link>

          <div className="flex items-center gap-2 bg-indigo-100 px-6 py-3 rounded-full border-2 border-white">
            <div className={`w-3 h-3 rounded-full animate-pulse ${palace.status === 'ready' ? 'bg-green-500' : palace.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`} />
            <span className="font-bold text-indigo-900 uppercase tracking-widest text-sm">
              {palace.status}
            </span>
          </div>
        </div>

        {/* Title Area */}
        <div className="bg-white rounded-[2rem] p-8 border-4 border-white shadow-[0_8px_0_0_rgba(224,231,255,1)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-indigo-50 opacity-50 rotate-12">
            <BrainCircuit size={200} />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-black text-indigo-950 font-['Baloo_2'] tracking-tight drop-shadow-sm">
                {palace.title}
              </h1>
              <p className="text-xl text-indigo-600 font-medium">
                Goal: <span className="text-indigo-800">{palace.prompt}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-4 items-start">
              <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[120px]">
                <Activity className="text-indigo-500 mb-1" />
                <span className="text-sm font-bold text-indigo-400 uppercase">Latest Score</span>
                <span className="text-2xl font-black text-indigo-900 font-['Baloo_2']">
                  {latestSession ? `${latestSession.scorePct?.toFixed(0)}%` : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Room View (Client Component) */}
        <PalaceRoomView rooms={roomsData} />

        {/* Quiz / Grading */}
        <TestFlow palaceId={palace.id} />

        {/* Sources Footer */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-8 shadow-[0_8px_0_0_rgba(79,70,229,0.5)] text-white relative overflow-hidden group">
          <div className="absolute right-[-20%] top-[-50%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors"></div>
          
          <h2 className="text-3xl font-black font-['Baloo_2'] mb-2 flex items-center gap-3">
            <FileText className="opacity-80" />
            Sources
          </h2>
          <p className="opacity-90 font-medium text-lg line-clamp-2">
            {palace.documents.map((d: any) => d.fileName).join(', ') || 'No documents attached'}
          </p>
        </div>

      </div>

      {/* Shared Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #c7d2fe;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
