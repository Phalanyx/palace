'use client';

import React, { useState } from 'react';
import PalaceRoomView from './PalaceRoomView';
import TestFlow from './TestFlow';
import BuddyAgent from './BuddyAgent';

interface RoomObject {
  id: string;
  label: string;
  description: string;
  modelKey: string;
  colorHint: string | null;
  orderIndex: number;
  sampleQuestion: string | null;
  metadata?: Record<string, any> | null;
  mesh?: { storageUrl: string } | null;
}

interface Room {
  id: string;
  roomKey: string;
  orderIndex: number;
  objects: RoomObject[];
}

interface Document {
  rawText?: string | null;
  fileName?: string | null;
}

interface Palace {
  title: string;
  prompt: string;
  documents: Document[];
}

interface Props {
  palace: Palace;
  rooms: Room[];
  palaceId: string;
}

export default function PalaceInteractiveSection({ palace, rooms, palaceId }: Props) {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [selectedObject, setSelectedObject] = useState<RoomObject | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [currentTestQuestion, setCurrentTestQuestion] = useState<string | undefined>(undefined);

  return (
    <>
      <PalaceRoomView
        rooms={rooms}
        onRoomChange={(room) => {
          setActiveRoom(room);
          setSelectedObject(null);
        }}
        onObjectSelect={(obj) => setSelectedObject(obj)}
      />

      <TestFlow
        palaceId={palaceId}
        onTestModeChange={(active, question) => {
          setIsTestMode(active);
          setCurrentTestQuestion(question);
        }}
      />

      <BuddyAgent
        palace={palace}
        currentRoom={activeRoom}
        selectedObject={selectedObject}
        isTestMode={isTestMode}
        currentTestQuestion={currentTestQuestion}
      />
    </>
  );
}
