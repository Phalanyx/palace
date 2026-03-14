/**
 * Gemini Live API Client (TypeScript)
 * TypeScript port of react-demo-app/src/utils/gemini-api.js
 * Uses Vertex AI WebSocket proxy (server.py) for authentication
 */

const DEFAULT_LOCAL_PROXY_URL = 'ws://localhost:8080';
const configuredProxyUrl = process.env.NEXT_PUBLIC_BUDDY_WS_URL?.trim();

export const PROXY_URL = configuredProxyUrl || DEFAULT_LOCAL_PROXY_URL;
export const GEMINI_LIVE_MODEL = 'gemini-2.0-flash-live-preview-04-09';
const PROJECT_ID = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || 'project-078a97fa-7470-4e5a-b47';
const LOCATION = process.env.NEXT_PUBLIC_GCP_LOCATION || 'us-central1';
const API_HOST = `${LOCATION}-aiplatform.googleapis.com`;
const SERVICE_URL = `wss://${API_HOST}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

// Response type constants
export const MultimodalLiveResponseType = {
  TEXT: 'TEXT',
  AUDIO: 'AUDIO',
  SETUP_COMPLETE: 'SETUP COMPLETE',
  INTERRUPTED: 'INTERRUPTED',
  TURN_COMPLETE: 'TURN COMPLETE',
  TOOL_CALL: 'TOOL_CALL',
  ERROR: 'ERROR',
  INPUT_TRANSCRIPTION: 'INPUT_TRANSCRIPTION',
  OUTPUT_TRANSCRIPTION: 'OUTPUT_TRANSCRIPTION',
};

export interface TranscriptionData {
  text: string;
  finished: boolean;
}

export interface GeminiMessage {
  type: string;
  data: string | TranscriptionData | Record<string, unknown>;
  endOfTurn: boolean;
}

/**
 * Parses response messages from the Gemini Live API
 */
export class MultimodalLiveResponseMessage {
  data: string | TranscriptionData | Record<string, unknown> = '';
  type = '';
  endOfTurn = false;

  constructor(rawData: Record<string, unknown>) {
    this.endOfTurn = !!(rawData?.serverContent as any)?.turnComplete;

    const parts = (rawData?.serverContent as any)?.modelTurn?.parts;

    try {
      if (rawData?.setupComplete) {
        this.type = MultimodalLiveResponseType.SETUP_COMPLETE;
      } else if ((rawData?.serverContent as any)?.turnComplete) {
        this.type = MultimodalLiveResponseType.TURN_COMPLETE;
      } else if ((rawData?.serverContent as any)?.interrupted) {
        this.type = MultimodalLiveResponseType.INTERRUPTED;
      } else if ((rawData?.serverContent as any)?.inputTranscription) {
        this.type = MultimodalLiveResponseType.INPUT_TRANSCRIPTION;
        this.data = {
          text: (rawData.serverContent as any).inputTranscription.text || '',
          finished: (rawData.serverContent as any).inputTranscription.finished || false,
        };
      } else if ((rawData?.serverContent as any)?.outputTranscription) {
        this.type = MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION;
        this.data = {
          text: (rawData.serverContent as any).outputTranscription.text || '',
          finished: (rawData.serverContent as any).outputTranscription.finished || false,
        };
      } else if (rawData?.toolCall) {
        this.type = MultimodalLiveResponseType.TOOL_CALL;
        this.data = rawData.toolCall as Record<string, unknown>;
      } else if (parts?.length && parts[0].text) {
        this.data = parts[0].text;
        this.type = MultimodalLiveResponseType.TEXT;
      } else if (parts?.length && parts[0].inlineData) {
        this.data = parts[0].inlineData.data;
        this.type = MultimodalLiveResponseType.AUDIO;
      }
    } catch (e) {
      console.log('⚠️ Error parsing response data: ', rawData);
    }
  }
}

/**
 * Function call definition for tool use
 */
export class FunctionCallDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiredParameters: string[];

  constructor(
    name: string,
    description: string,
    parameters: Record<string, unknown>,
    requiredParameters: string[]
  ) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.requiredParameters = requiredParameters;
  }

  functionToCall(_parameters: Record<string, unknown>): void {
    console.log('▶️ Default function call');
  }

  getDefinition(): Record<string, unknown> {
    const definition = {
      name: this.name,
      description: this.description,
      parameters: { required: this.requiredParameters, ...this.parameters },
    };
    console.log('created FunctionDefinition: ', definition);
    return definition;
  }

  runFunction(parameters: Record<string, unknown>): void {
    console.log(
      `⚡ Running ${this.name} function with parameters: ${JSON.stringify(parameters)}`
    );
    this.functionToCall(parameters);
  }
}

export interface AutomaticActivityDetection {
  disabled?: boolean;
  silence_duration_ms?: number;
  prefix_padding_ms?: number;
  end_of_speech_sensitivity?: string;
  start_of_speech_sensitivity?: string;
}

export interface ProactivityConfig {
  proactiveAudio?: boolean;
}

/**
 * Main Gemini Live API client
 * TypeScript port of GeminiLiveAPI from gemini-api.js
 */
export class GeminiLiveClient {
  private proxyUrl: string;
  private projectId: string;
  private model: string;
  private modelUri: string;
  private serviceUrl: string;
  private webSocket: WebSocket | null = null;
  private lastSetupMessage: Record<string, unknown> | null = null;
  private functionsMap: Record<string, FunctionCallDefinition> = {};
  private totalBytesSent = 0;

  // Config
  responseModalities: string[] = ['AUDIO'];
  systemInstructions = '';
  googleGrounding = false;
  enableAffectiveDialog = false;
  voiceName = 'Puck';
  temperature = 1.0;
  proactivity: ProactivityConfig = { proactiveAudio: false };
  inputAudioTranscription = false;
  outputAudioTranscription = false;
  enableFunctionCalls = false;
  functions: FunctionCallDefinition[] = [];
  automaticActivityDetection: AutomaticActivityDetection = {
    disabled: false,
    silence_duration_ms: 2000,
    prefix_padding_ms: 500,
    end_of_speech_sensitivity: 'END_SENSITIVITY_UNSPECIFIED',
    start_of_speech_sensitivity: 'START_SENSITIVITY_UNSPECIFIED',
  };

  connected = false;

  // Callbacks
  onReceiveResponse: (message: MultimodalLiveResponseMessage) => void = (message) => {
    console.log('Default message received callback', message);
  };
  onConnectionStarted: () => void = () => {
    console.log('Default onConnectionStarted');
  };
  onErrorMessage: (message: string) => void = (message) => {
    alert(message);
    this.connected = false;
  };
  onClose: (event?: CloseEvent) => void = () => {
    console.log('Default onClose');
  };

  // Individual type callbacks (convenience wrappers used by BuddyAgent)
  onAudio: (base64pcm: string) => void = () => {};
  onText: (text: string) => void = () => {};
  onInputTranscript: (text: string, finished: boolean) => void = () => {};
  onOutputTranscript: (text: string, finished: boolean) => void = () => {};
  onTurnComplete: () => void = () => {};
  onInterrupted: () => void = () => {};
  onSetupComplete: () => void = () => {};
  onError: (msg: string) => void = () => {};

  constructor(
    projectId = PROJECT_ID,
    model = GEMINI_LIVE_MODEL,
    proxyUrl = PROXY_URL
  ) {
    this.proxyUrl = proxyUrl;
    this.projectId = projectId;
    this.model = model;
    this.modelUri = `projects/${this.projectId}/locations/${LOCATION}/publishers/google/models/${this.model}`;
    this.serviceUrl = SERVICE_URL;

    console.log('Created Gemini Live API object: ', this);
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
    this.modelUri = `projects/${this.projectId}/locations/${LOCATION}/publishers/google/models/${this.model}`;
  }

  setSystemInstructions(newSystemInstructions: string): void {
    console.log('setting system instructions: ', newSystemInstructions);
    this.systemInstructions = newSystemInstructions;
  }

  setGoogleGrounding(newGoogleGrounding: boolean): void {
    console.log('setting google grounding: ', newGoogleGrounding);
    this.googleGrounding = newGoogleGrounding;
  }

  setResponseModalities(modalities: string[]): void {
    this.responseModalities = modalities;
  }

  setVoice(voiceName: string): void {
    console.log('setting voice: ', voiceName);
    this.voiceName = voiceName;
  }

  setProactivity(proactivity: ProactivityConfig): void {
    console.log('setting proactivity: ', proactivity);
    this.proactivity = proactivity;
  }

  setInputAudioTranscription(enabled: boolean): void {
    console.log('setting input audio transcription: ', enabled);
    this.inputAudioTranscription = enabled;
  }

  setOutputAudioTranscription(enabled: boolean): void {
    console.log('setting output audio transcription: ', enabled);
    this.outputAudioTranscription = enabled;
  }

  setEnableFunctionCalls(enabled: boolean): void {
    console.log('setting enable function calls: ', enabled);
    this.enableFunctionCalls = enabled;
  }

  addFunction(newFunction: FunctionCallDefinition): void {
    this.functions.push(newFunction);
    this.functionsMap[newFunction.name] = newFunction;
    console.log('added function: ', newFunction);
  }

  callFunction(functionName: string, parameters: Record<string, unknown>): void {
    const functionToCall = this.functionsMap[functionName];
    if (functionToCall) {
      functionToCall.runFunction(parameters);
    } else {
      console.error(`Function ${functionName} not found`);
    }
  }

  connect(systemPrompt?: string): void {
    if (systemPrompt !== undefined) {
      this.systemInstructions = systemPrompt;
      // Enable transcription when connecting via BuddyAgent
      this.inputAudioTranscription = true;
      this.outputAudioTranscription = true;
    }
    this.setupWebSocketToService();
  }

  disconnect(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.connected = false;
    }
  }

  /** Reconnect with a new system prompt (for context updates) */
  updateSystemPrompt(newPrompt: string): void {
    this.disconnect();
    this.connect(newPrompt);
  }

  sendMessage(message: Record<string, unknown>): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  onReceiveMessage(messageEvent: MessageEvent): void {
    const messageData = JSON.parse(messageEvent.data);
    const message = new MultimodalLiveResponseMessage(messageData);
    this.onReceiveResponse(message);
    // Also dispatch to individual callbacks
    this.dispatchMessage(message);
  }

  setupWebSocketToService(): void {
    console.log('connecting: ', this.proxyUrl);

    this.webSocket = new WebSocket(this.proxyUrl);

    this.webSocket.onclose = (event) => {
      console.log('websocket closed: ', event);
      this.connected = false;
      this.onClose(event);
    };

    this.webSocket.onerror = () => {
      console.log('websocket error');
      this.connected = false;
      this.onErrorMessage('WebSocket connection error. Is server.py running on port 8080?');
      this.onError('WebSocket connection error. Is server.py running on port 8080?');
    };

    this.webSocket.onopen = (event) => {
      console.log('websocket open: ', event);
      this.connected = true;
      this.totalBytesSent = 0;
      this.sendInitialSetupMessages();
      this.onConnectionStarted();
    };

    this.webSocket.onmessage = this.onReceiveMessage.bind(this);
  }

  getFunctionDefinitions(): Record<string, unknown>[] {
    console.log('🛠️ getFunctionDefinitions called');
    const tools: Record<string, unknown>[] = [];

    for (let index = 0; index < this.functions.length; index++) {
      const func = this.functions[index];
      tools.push(func.getDefinition());
    }
    return tools;
  }

  sendInitialSetupMessages(): void {
    const serviceSetupMessage = {
      service_url: this.serviceUrl,
    };
    this.sendMessage(serviceSetupMessage);

    const tools = this.getFunctionDefinitions();

    const sessionSetupMessage: Record<string, any> = {
      setup: {
        model: this.modelUri,
        generation_config: {
          response_modalities: this.responseModalities,
          temperature: this.temperature,
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.voiceName,
              },
            },
          },
        },
        system_instruction: { parts: [{ text: this.systemInstructions }] },
        tools: { function_declarations: tools },
        proactivity: this.proactivity,
        realtime_input_config: {
          automatic_activity_detection: this.automaticActivityDetection,
        },
      },
    };

    // Add transcription config if enabled
    if (this.inputAudioTranscription) {
      sessionSetupMessage.setup.input_audio_transcription = {};
    }
    if (this.outputAudioTranscription) {
      sessionSetupMessage.setup.output_audio_transcription = {};
    }

    if (this.googleGrounding) {
      sessionSetupMessage.setup.tools.google_search = {};
      // Currently can't have both Google Search with custom tools.
      console.log('Google Grounding enabled, removing custom function calls if any.');
      delete sessionSetupMessage.setup.tools.function_declarations;
    }

    // Add affective dialog if enabled
    if (this.enableAffectiveDialog) {
      sessionSetupMessage.setup.generation_config.enable_affective_dialog = true;
    }

    // Store the setup message for later access
    this.lastSetupMessage = sessionSetupMessage;

    console.log('sessionSetupMessage: ', sessionSetupMessage);
    this.sendMessage(sessionSetupMessage);
  }

  sendTextMessage(text: string): void {
    const textMessage = {
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [{ text: text }],
          },
        ],
        turn_complete: true,
      },
    };
    this.sendMessage(textMessage);
  }

  /** Alias used by BuddyAgent */
  sendText(text: string): void {
    this.sendTextMessage(text);
  }

  sendToolResponse(toolCallId: string, response: unknown): void {
    const message = {
      tool_response: {
        id: toolCallId,
        response: response,
      },
    };
    console.log('🔧 Sending tool response:', message);
    this.sendMessage(message);
  }

  sendRealtimeInputMessage(data: string, mime_type: string): void {
    const message = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: mime_type,
            data: data,
          },
        ],
      },
    };
    this.sendMessage(message);
    this.addToBytesSent(data);
  }

  private addToBytesSent(data: string): void {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    this.totalBytesSent += encodedData.length;
  }

  getBytesSent(): number {
    return this.totalBytesSent;
  }

  sendAudioMessage(base64PCM: string): void {
    this.sendRealtimeInputMessage(base64PCM, 'audio/pcm');
  }

  /** Alias used by AudioStreamer */
  sendAudio(base64PCM: string): void {
    this.sendAudioMessage(base64PCM);
  }

  async sendImageMessage(base64Image: string, mime_type = 'image/jpeg'): Promise<void> {
    this.sendRealtimeInputMessage(base64Image, mime_type);
  }

  /** Alias used by VideoStreamer/ScreenCapture */
  sendImage(base64Image: string, mime_type = 'image/jpeg'): void {
    this.sendRealtimeInputMessage(base64Image, mime_type);
  }

  /**
   * Dispatch parsed message to individual type-specific callbacks
   * (convenience layer used by BuddyAgent)
   */
  private dispatchMessage(msg: MultimodalLiveResponseMessage): void {
    switch (msg.type) {
      case MultimodalLiveResponseType.SETUP_COMPLETE:
        this.onSetupComplete();
        break;
      case MultimodalLiveResponseType.AUDIO:
        this.onAudio(msg.data as string);
        break;
      case MultimodalLiveResponseType.TEXT:
        this.onText(msg.data as string);
        break;
      case MultimodalLiveResponseType.INPUT_TRANSCRIPTION: {
        const t = msg.data as TranscriptionData;
        this.onInputTranscript(t.text, t.finished);
        break;
      }
      case MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION: {
        const t = msg.data as TranscriptionData;
        this.onOutputTranscript(t.text, t.finished);
        break;
      }
      case MultimodalLiveResponseType.TURN_COMPLETE:
        this.onTurnComplete();
        break;
      case MultimodalLiveResponseType.INTERRUPTED:
        this.onInterrupted();
        break;
    }
  }
}
