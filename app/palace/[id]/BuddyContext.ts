export interface BuddyContextInput {
  palaceTitle: string;
  palaceId: string;
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
  openObjects: Array<{ label: string; description: string }>;
  mode: 'explore' | 'test-hint' | 'buddy-quiz';
  currentQuestion?: string;
}

export function buildSystemPrompt(ctx: BuddyContextInput): string {
  const namespace = `albertPalace${ctx.palaceId}`;

  let prompt = `You are a friendly, encouraging study buddy helping the user learn: "${ctx.palaceTitle}".
Their learning goal: ${ctx.palacePrompt}.

COURSE CONTENT:
${ctx.documentSummaries.length > 0
  ? ctx.documentSummaries.map((s, i) => `Document ${i + 1}:\n${s}`).join('\n\n')
  : '(No document content available — use the object descriptions as your source of truth.)'
}

IMPORTANT: You are a learning assistant. While you should keep the conversation focused on the CURRENT object (see FOCUSED TOPIC below), you should be helpful and exhaustive when answering questions ABOUT that topic. 

If the user asks for more depth, specific facts, or information that isn't in your immediate memory, YOU MUST use the "askMoorcheh" or "searchMoorcheh" tools to find the answer. Do not guess and do not refuse to answer if the tool could provide the information.

If the user goes completely off-topic (e.g. asking about unrelated things not in the room), then politely redirect them to the current topic. However, detailed questions about the focused object are NEVER off-topic.

Use namespace "${namespace}" for all tool calls. Use searchMoorcheh to find facts/excerpts, and askMoorcheh to get a synthesized answer based on the documents.
`;

  if (ctx.currentRoom) {
    prompt += `
CURRENT ROOM: ${ctx.currentRoom.roomKey.replace(/_/g, ' ')}
Topics in this room:
${ctx.currentRoom.objects.map(o => `- ${o.label}: ${o.description}`).join('\n')}
`;
  }

  if (ctx.openObjects.length > 0) {
    prompt += `
CURRENTLY OPEN POPUPS (user is actively viewing these objects):
${ctx.openObjects.map(o => `- ${o.label}: ${o.description}`).join('\n')}
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
  } else if (ctx.mode === 'buddy-quiz') {
    prompt += `
QUIZ MODE ACTIVE: You are the quiz master.
- Pick one object from the current room and ask the user a question about it
- Wait for their answer
- Give brief feedback (correct/incorrect + brief explanation)
- Then move on to the next object/question
- Cover all objects in the room before repeating
- Keep questions conversational and spoken
- Do NOT give the answer before the user responds
Start immediately by asking the first question.
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
