/**
 * Media Utilities - Audio streaming helpers for Gemini Live API
 */

import type { GeminiLiveClient } from './gemini-live-client';

export class AudioStreamer {
  private client: GeminiLiveClient;
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  isStreaming = false;
  private readonly sampleRate = 16000;

  constructor(client: GeminiLiveClient) {
    this.client = client;
  }

  async start(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: this.sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    await this.audioContext.audioWorklet.addModule('/audio-processors/capture.worklet.js');
    this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');

    this.audioWorklet.port.onmessage = (event) => {
      if (!this.isStreaming) return;
      if (event.data.type === 'audio') {
        const pcm = this.convertToPCM16(event.data.data as Float32Array);
        const b64 = this.arrayBufferToBase64(pcm);
        if (this.client.connected) {
          this.client.sendAudio(b64);
        }
      }
    };

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    source.connect(this.audioWorklet);
    this.isStreaming = true;
  }

  stop(): void {
    this.isStreaming = false;
    this.audioWorklet?.disconnect();
    this.audioWorklet?.port.close();
    this.audioWorklet = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
  }

  private convertToPCM16(float32: Float32Array): ArrayBuffer {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s * 0x7fff;
    }
    return int16.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized = false;
  private readonly sampleRate = 24000;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    await this.audioContext.audioWorklet.addModule('/audio-processors/playback.worklet.js');
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
    this.gainNode = this.audioContext.createGain();
    this.workletNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    this.isInitialized = true;
  }

  async play(base64Audio: string): Promise<void> {
    if (!this.isInitialized) await this.init();
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }
    this.workletNode!.port.postMessage(float32);
  }

  interrupt(): void {
    this.workletNode?.port.postMessage('interrupt');
  }

  destroy(): void {
    this.audioContext?.close();
    this.audioContext = null;
    this.isInitialized = false;
  }
}
