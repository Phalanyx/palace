/**
 * Media Utilities - Audio and Video streaming helpers for Gemini Live API
 * TypeScript port of react-demo-app/src/utils/media-utils.js
 */

import type { GeminiLiveClient } from './gemini-live-client';

/**
 * Audio Streamer - Captures and streams microphone audio
 */
export class AudioStreamer {
  private client: GeminiLiveClient;
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  isStreaming = false;
  private readonly sampleRate = 16000; // Gemini requires 16kHz

  constructor(client: GeminiLiveClient) {
    this.client = client;
  }

  /**
   * Start streaming audio from microphone
   * @param deviceId - Optional device ID for specific microphone
   */
  async start(deviceId: string | null = null): Promise<boolean> {
    try {
      // Build audio constraints
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: this.sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      // Add device ID if specified
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // Create audio context at 16kHz
      this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });

      // Load the audio worklet module
      await this.audioContext!.audioWorklet.addModule('/audio-processors/capture.worklet.js');

      // Create the audio worklet node
      this.audioWorklet = new AudioWorkletNode(this.audioContext!, 'audio-capture-processor');

      // Set up message handling from the worklet
      this.audioWorklet.port.onmessage = (event) => {
        if (!this.isStreaming) return;

        if (event.data.type === 'audio') {
          const inputData = event.data.data as Float32Array;
          const pcmData = this.convertToPCM16(inputData);
          const base64Audio = this.arrayBufferToBase64(pcmData);

          // Send to Gemini
          if (this.client && this.client.connected) {
            this.client.sendAudio(base64Audio);
          }
        }
      };

      // Create analyser node for audio visualization
      this.analyserNode = this.audioContext!.createAnalyser();
      this.analyserNode.fftSize = 256;

      // Connect the audio graph: source → analyser → worklet
      const source = this.audioContext!.createMediaStreamSource(this.mediaStream!);
      source.connect(this.analyserNode);
      this.analyserNode.connect(this.audioWorklet);

      this.isStreaming = true;
      console.log('🎤 Audio streaming started');
      return true;
    } catch (error) {
      console.error('Failed to start audio streaming:', error);
      throw error;
    }
  }

  /**
   * Stop audio streaming
   */
  stop(): void {
    this.isStreaming = false;

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet.port.close();
      this.audioWorklet = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    console.log('🛑 Audio streaming stopped');
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Convert Float32Array to PCM16 Int16Array
   */
  private convertToPCM16(float32Array: Float32Array): ArrayBuffer {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample * 0x7fff;
    }
    return int16Array.buffer;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

/**
 * Base Video Capture - Shared functionality for video/screen capture
 */
class BaseVideoCapture {
  protected client: GeminiLiveClient;
  protected video: HTMLVideoElement | null = null;
  protected canvas: HTMLCanvasElement | null = null;
  protected ctx: CanvasRenderingContext2D | null = null;
  protected mediaStream: MediaStream | null = null;
  protected isStreaming = false;
  protected captureInterval: ReturnType<typeof setInterval> | null = null;
  protected fps = 1; // Default 1 frame per second
  protected quality = 0.8; // Default JPEG quality

  constructor(client: GeminiLiveClient) {
    this.client = client;
  }

  /**
   * Initialize canvas and video elements
   */
  protected initializeElements(width: number, height: number): void {
    // Create video element
    this.video = document.createElement('video');
    this.video.srcObject = this.mediaStream;
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;

    // Create canvas for frame capture
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Wait for video to be ready and start playing
   */
  protected async waitForVideoReady(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.video!.onloadedmetadata = () => resolve();
    });
    this.video!.play();
  }

  /**
   * Start capturing and sending frames
   */
  protected startCapturing(): void {
    const captureFrame = () => {
      if (!this.isStreaming) return;

      // Draw current frame to canvas
      this.ctx!.drawImage(this.video!, 0, 0, this.canvas!.width, this.canvas!.height);

      // Convert to JPEG and send
      this.canvas!.toBlob(
        (blob) => {
          if (!blob) return;

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            if (this.client && this.client.connected) {
              this.client.sendImage(base64, 'image/jpeg');
            }
          };
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        this.quality
      );
    };

    // Start interval
    this.captureInterval = setInterval(captureFrame, 1000 / this.fps);
  }

  /**
   * Stop capturing
   */
  stop(): void {
    this.isStreaming = false;

    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }

    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Take a single snapshot
   */
  takeSnapshot(): string {
    if (!this.video || !this.canvas) {
      throw new Error('Video not initialized');
    }

    this.ctx!.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    return this.canvas.toDataURL('image/jpeg', this.quality);
  }

  /**
   * Get the video element for preview
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }
}

export interface VideoStreamerOptions {
  fps?: number;
  width?: number;
  height?: number;
  facingMode?: string;
  quality?: number;
  deviceId?: string | null;
}

/**
 * Video Streamer - Captures and streams camera video
 */
export class VideoStreamer extends BaseVideoCapture {
  /**
   * Start video streaming from camera
   */
  async start(options: VideoStreamerOptions = {}): Promise<HTMLVideoElement> {
    try {
      const {
        fps = 1,
        width = 640,
        height = 480,
        facingMode = 'user', // 'user' for front camera, 'environment' for back
        quality = 0.8,
        deviceId = null,
      } = options;

      this.fps = fps;
      this.quality = quality;

      // Build video constraints
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: width },
        height: { ideal: height },
      };

      // Add device ID if specified, otherwise use facingMode
      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId };
      } else {
        videoConstraints.facingMode = facingMode;
      }

      // Get camera access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
      });

      // Initialize video and canvas elements
      this.initializeElements(width, height);

      // Wait for video to be ready
      await this.waitForVideoReady();

      // Start capturing frames
      this.isStreaming = true;
      this.startCapturing();

      console.log('📹 Camera streaming started at', fps, 'fps');
      return this.video!; // Return video element for preview
    } catch (error) {
      console.error('Failed to start camera streaming:', error);
      throw error;
    }
  }

  stop(): void {
    super.stop();
    console.log('🛑 Camera streaming stopped');
  }
}

export interface ScreenCaptureOptions {
  fps?: number;
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Screen Capture - Captures and streams screen/window
 */
export class ScreenCapture extends BaseVideoCapture {
  /**
   * Start screen capture
   */
  async start(options: ScreenCaptureOptions = {}): Promise<HTMLVideoElement> {
    try {
      const { fps = 1, width = 1280, height = 720, quality = 0.7 } = options;

      this.fps = fps;
      this.quality = quality;

      // Get screen capture permission
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });

      // Initialize video and canvas elements
      this.initializeElements(width, height);

      // Wait for video to be ready
      await this.waitForVideoReady();

      // Start capturing frames
      this.isStreaming = true;
      this.startCapturing();

      // Handle stream end (user stops sharing)
      this.mediaStream.getVideoTracks()[0].onended = () => {
        console.log('User stopped screen sharing');
        this.stop();
      };

      console.log('🖥️ Screen capture started at', fps, 'fps');
      return this.video!; // Return video element for preview
    } catch (error) {
      console.error('Failed to start screen capture:', error);
      throw error;
    }
  }

  stop(): void {
    super.stop();
    console.log('🛑 Screen capture stopped');
  }
}

/**
 * Audio Player - Plays audio responses from Gemini
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null; // Guard against concurrent init calls
  private readonly sampleRate = 24000; // Gemini outputs at 24kHz
  volume = 1.0;

  /**
   * Initialize the audio player
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    // Guard against concurrent calls
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Create audio context at 24kHz to match Gemini
        this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({
          sampleRate: this.sampleRate,
        });

        // Load the audio worklet from external file
        await this.audioContext!.audioWorklet.addModule('/audio-processors/playback.worklet.js');

        // Create worklet node
        this.workletNode = new AudioWorkletNode(this.audioContext!, 'pcm-processor');

        // Create gain node for volume control
        this.gainNode = this.audioContext!.createGain();
        this.gainNode.gain.value = this.volume;

        // Create analyser node for audio visualization
        this.analyserNode = this.audioContext!.createAnalyser();
        this.analyserNode.fftSize = 256;

        // Connect nodes: worklet → gain → analyser → destination
        this.workletNode.connect(this.gainNode);
        this.gainNode.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext!.destination);

        this.isInitialized = true;
        console.log('🔊 Audio player initialized');
      } catch (error) {
        console.error('Failed to initialize audio player:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Play audio chunk from base64 PCM
   */
  async play(base64Audio: string): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }

      // Convert base64 to Float32Array
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 LE to Float32
      const inputArray = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(inputArray.length);
      for (let i = 0; i < inputArray.length; i++) {
        float32Data[i] = inputArray[i] / 32768;
      }

      // Send to worklet for playback
      this.workletNode!.port.postMessage(float32Data);
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      throw error;
    }
  }

  /**
   * Interrupt current playback
   */
  interrupt(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage('interrupt');
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Clean up resources
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  destroy(): void {
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}
