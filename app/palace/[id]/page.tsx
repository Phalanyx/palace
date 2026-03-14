import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PalaceExterior } from './PalaceExterior';
import { ArrowLeft, BrainCircuit, Library, FileText, Activity } from 'lucide-react';
import Link from 'next/link';

// Dynamically rendered to fetch fresh palace data
export const dynamic = 'force-dynamic';

export default async function PalacePage(props: { params: Promise<{ id: string }> }) {
  // Await the params
  const params = await props.params;

  const palace = await prisma.palace.findUnique({
    where: { id: params.id },
    include: {
      objects: {
        orderBy: { orderIndex: 'asc' }
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
          
          {/* Left Column: 3D Exterior View */}
          <div className="lg:col-span-7 rounded-[2rem] overflow-hidden bg-white p-2 border-4 border-indigo-100 shadow-[0_8px_0_0_rgba(224,231,255,1)]">
            <PalaceExterior />
          </div>

          {/* Right Column: Information & Overview */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-white rounded-[2rem] p-8 border-4 border-indigo-50 shadow-[0_8px_0_0_rgba(224,231,255,1)] flex-grow">
              <h2 className="text-3xl font-black font-['Baloo_2'] text-indigo-900 mb-6 flex items-center gap-3">
                <Library className="text-indigo-500" />
                Memory Objects
              </h2>
              
              {palace.objects.length === 0 ? (
                <div className="text-center py-10 opacity-60 font-medium text-lg text-indigo-800 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200">
                  No objects generated yet.
                </div>
              ) : (
                <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {palace.objects.map((obj: any) => (
                    <li key={obj.id} className="flex gap-4 p-4 rounded-2xl hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-100 transition-colors cursor-default group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 border border-indigo-200 shadow-sm group-hover:scale-110 transition-transform">
                        {obj.orderIndex}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-indigo-950 capitalize">{obj.label}</h3>
                        <p className="text-indigo-600/80 text-base leading-snug">
                          {obj.description}
                        </p>
                        {obj.sampleQuestion && (
                          <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-2 items-start opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-indigo-400 font-bold font-['Baloo_2']">Q:</span>
                            <p className="text-sm font-medium text-indigo-700 leading-snug italic">
                              {obj.sampleQuestion}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
        </div>

      </div>

      {/* Shared Custom Scrollbar Styles for the list */}
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
