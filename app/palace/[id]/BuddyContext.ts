export interface BuddyContextInput {
  palaceTitle: string;
  palacePrompt: string;
  documentSummaries: string[];
  currentRoom: {
    roomKey: string;
    objects: Array<{ label: string; description: string }>;
  } | null;
  selectedObject: {
    label: string;
    description: string;
    sampleQuestion: string | null;
  } | null;
  mode: 'explore' | 'test-hint';
  currentQuestion?: string;
}

export function buildSystemPrompt(ctx: BuddyContextInput): string {
  let prompt = `You are a friendly, encouraging study buddy helping the user learn: "${ctx.palaceTitle}".
Their learning goal: ${ctx.palacePrompt}.

COURSE CONTENT:
${ctx.documentSummaries.length > 0
  ? ctx.documentSummaries.map((s, i) => `Document ${i + 1}:\n${s}`).join('\n\n')
  : '(No document content available — use the object descriptions as your source of truth.)'
}
`;

  if (ctx.currentRoom) {
    prompt += `
CURRENT ROOM: ${ctx.currentRoom.roomKey.replace(/_/g, ' ')}
Topics in this room:
${ctx.currentRoom.objects.map(o => `- ${o.label}: ${o.description}`).join('\n')}
`;
  }

  if (ctx.selectedObject) {
    prompt += `
FOCUSED TOPIC: "${ctx.selectedObject.label}"
This object represents: ${ctx.selectedObject.description}
${ctx.selectedObject.sampleQuestion ? `Example question: ${ctx.selectedObject.sampleQuestion}` : ''}
`;
  }

  if (ctx.mode === 'test-hint') {
    prompt += `
TEST MODE ACTIVE. The user is answering: "${ctx.currentQuestion || 'a test question'}"
Your role: Give HINTS only — do NOT give the direct answer. Help the user recall by:
- Asking guiding sub-questions
- Pointing to related concepts from the course content
- Encouraging them to think about what the object "${ctx.selectedObject?.label || 'in focus'}" represents
Keep responses concise and spoken (you are a voice assistant).
`;
  } else {
    prompt += `
EXPLORE MODE: Help the user understand and discuss any topic from this course.
When discussing the focused object, connect it back to the source material.
Keep responses conversational and spoken — you are a voice assistant.
`;
  }

  return prompt;
}
