/**
 * Gemini Live API Client (TypeScript)
 * Uses Gemini API key auth via WebSocket proxy
 */

export const PROXY_URL = 'ws://localhost:8080';
export const GEMINI_LIVE_MODEL = 'gemini-2.0-flash-live-001';

export interface TranscriptionData {
  text: string;
  finished: boolean;
}

export interface GeminiMessage {
  type: string;
  data: string | TranscriptionData | Record<string, unknown>;
  endOfTurn: boolean;
}

const ResponseType = {
  TEXT: 'TEXT',
  AUDIO: 'AUDIO',
  SETUP_COMPLETE: 'SETUP_COMPLETE',
  INTERRUPTED: 'INTERRUPTED',
  TURN_COMPLETE: 'TURN_COMPLETE',
  TOOL_CALL: 'TOOL_CALL',
  INPUT_TRANSCRIPTION: 'INPUT_TRANSCRIPTION',
  OUTPUT_TRANSCRIPTION: 'OUTPUT_TRANSCRIPTION',
};

function parseMessage(data: Record<string, unknown>): GeminiMessage {
  const msg: GeminiMessage = { type: '', data: '', endOfTurn: false };
  msg.endOfTurn = !!(data?.serverContent as any)?.turnComplete;

  const parts = (data?.serverContent as any)?.modelTurn?.parts;

  try {
    if (data?.setupComplete) {
      msg.type = ResponseType.SETUP_COMPLETE;
    } else if ((data?.serverContent as any)?.turnComplete) {
      msg.type = ResponseType.TURN_COMPLETE;
    } else if ((data?.serverContent as any)?.interrupted) {
      msg.type = ResponseType.INTERRUPTED;
    } else if ((data?.serverContent as any)?.inputTranscription) {
      msg.type = ResponseType.INPUT_TRANSCRIPTION;
      msg.data = {
        text: (data.serverContent as any).inputTranscription.text || '',
        finished: (data.serverContent as any).inputTranscription.finished || false,
      };
    } else if ((data?.serverContent as any)?.outputTranscription) {
      msg.type = ResponseType.OUTPUT_TRANSCRIPTION;
      msg.data = {
        text: (data.serverContent as any).outputTranscription.text || '',
        finished: (data.serverContent as any).outputTranscription.finished || false,
      };
    } else if (data?.toolCall) {
      msg.type = ResponseType.TOOL_CALL;
      msg.data = data.toolCall as Record<string, unknown>;
    } else if (parts?.length && parts[0].text) {
      msg.type = ResponseType.TEXT;
      msg.data = parts[0].text;
    } else if (parts?.length && parts[0].inlineData) {
      msg.type = ResponseType.AUDIO;
      msg.data = parts[0].inlineData.data;
    }
  } catch (e) {
    console.warn('Error parsing Gemini message:', data);
  }

  return msg;
}

export class GeminiLiveClient {
  private proxyUrl: string;
  private apiKey: string;
  private serviceUrl: string;
  private webSocket: WebSocket | null = null;
  private systemPrompt = '';
  private voiceName = 'Puck';

  connected = false;

  onAudio: (base64pcm: string) => void = () => {};
  onText: (text: string) => void = () => {};
  onInputTranscript: (text: string, finished: boolean) => void = () => {};
  onOutputTranscript: (text: string, finished: boolean) => void = () => {};
  onTurnComplete: () => void = () => {};
  onSetupComplete: () => void = () => {};
  onClose: () => void = () => {};
  onError: (msg: string) => void = () => {};

  constructor(apiKey: string, proxyUrl = PROXY_URL) {
    this.apiKey = apiKey;
    this.proxyUrl = proxyUrl;
    this.serviceUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
  }

  connect(systemPrompt: string): void {
    this.systemPrompt = systemPrompt;
    this.setupWebSocket();
  }

  disconnect(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
      this.connected = false;
    }
  }

  /** Reconnect with a new system prompt (for context updates) */
  updateSystemPrompt(newPrompt: string): void {
    this.disconnect();
    this.connect(newPrompt);
  }

  sendAudio(base64pcm: string): void {
    this.sendMessage({
      realtime_input: {
        media_chunks: [{ mime_type: 'audio/pcm', data: base64pcm }],
      },
    });
  }

  sendText(text: string): void {
    this.sendMessage({
      client_content: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turn_complete: true,
      },
    });
  }

  private sendMessage(msg: Record<string, unknown>): void {
    if (this.webSocket?.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(msg));
    }
  }

  private setupWebSocket(): void {
    this.webSocket = new WebSocket(this.proxyUrl);

    this.webSocket.onopen = () => {
      this.connected = true;
      this.sendInitialSetup();
    };

    this.webSocket.onclose = (event) => {
      this.connected = false;
      this.onClose();
    };

    this.webSocket.onerror = () => {
      this.connected = false;
      this.onError('WebSocket connection error. Is server.py running on port 8080?');
    };

    this.webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const msg = parseMessage(data);
        this.handleMessage(msg);
      } catch (e) {
        console.warn('Failed to parse Gemini message', e);
      }
    };
  }

  private sendInitialSetup(): void {
    // First message: tell proxy where to connect
    this.sendMessage({ service_url: this.serviceUrl });

    // Second message: Gemini session setup
    this.sendMessage({
      setup: {
        model: GEMINI_LIVE_MODEL,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: { voice_name: this.voiceName },
            },
          },
        },
        system_instruction: { parts: [{ text: this.systemPrompt }] },
        input_audio_transcription: {},
        output_audio_transcription: {},
        realtime_input_config: {
          automatic_activity_detection: {
            disabled: false,
            silence_duration_ms: 2000,
          },
        },
      },
    });
  }

  private handleMessage(msg: GeminiMessage): void {
    switch (msg.type) {
      case ResponseType.SETUP_COMPLETE:
        this.onSetupComplete();
        break;
      case ResponseType.AUDIO:
        this.onAudio(msg.data as string);
        break;
      case ResponseType.TEXT:
        this.onText(msg.data as string);
        break;
      case ResponseType.INPUT_TRANSCRIPTION: {
        const t = msg.data as TranscriptionData;
        this.onInputTranscript(t.text, t.finished);
        break;
      }
      case ResponseType.OUTPUT_TRANSCRIPTION: {
        const t = msg.data as TranscriptionData;
        this.onOutputTranscript(t.text, t.finished);
        break;
      }
      case ResponseType.TURN_COMPLETE:
        this.onTurnComplete();
        break;
    }
  }
}
