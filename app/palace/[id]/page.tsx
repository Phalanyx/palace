import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PalaceRoomView from './PalaceRoomView';

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
    }
  });

  if (!palace) notFound();

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
    <div className="h-screen overflow-hidden font-['Comic_Neue']">
      <PalaceRoomView
        rooms={roomsData}
        palaceId={palace.id}
        palaceTitle={palace.title}
        palacePrompt={palace.prompt}
      />
    </div>
  );
}
