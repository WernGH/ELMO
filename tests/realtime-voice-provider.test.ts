import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  createRealtimeVoiceProvider,
  GeminiLiveProvider,
  BrowserRealtimeVoiceProvider,
} from "@/services/voice/providers/realtime-voice.provider";
import { RealtimeVoiceChunk } from "@/services/voice/voice.types";

describe("Phase 3: Realtime Voice Providers & Reconnection Architecture", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should create appropriate provider instances from factory", () => {
    const liveProvider = createRealtimeVoiceProvider("gemini-live");
    expect(liveProvider).toBeInstanceOf(GeminiLiveProvider);

    const browserProvider = createRealtimeVoiceProvider("browser");
    expect(browserProvider).toBeInstanceOf(BrowserRealtimeVoiceProvider);
  });

  it("should connect and perform handshake in GeminiLiveProvider", async () => {
    // Mock global fetch for handshake
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", sessionId: "vses_test" }),
    } as any);

    const provider = new GeminiLiveProvider();
    expect(provider.isConnected()).toBe(false);

    const stateChanges: string[] = [];
    provider.onStateChange((st) => stateChanges.push(st));

    await provider.connect({ sessionId: "vses_test_1" });
    expect(provider.isConnected()).toBe(true);
    expect(stateChanges).toContain("PROCESSING");
    expect(stateChanges).toContain("LISTENING");

    await provider.disconnect();
    expect(provider.isConnected()).toBe(false);
    expect(stateChanges).toContain("STANDBY");
  });

  it("should attempt auto-reconnect with exponential backoff on handshake failure", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error("Network timeout");
      }
      return {
        ok: true,
        json: async () => ({ status: "ready" }),
      } as any;
    });

    const provider = new GeminiLiveProvider({ maxRetries: 2, backoffMs: 10 });
    const states: string[] = [];
    provider.onStateChange((st) => states.push(st));

    await provider.connect();
    expect(states).toContain("RECONNECTING");
    expect(provider.isConnected()).toBe(true);
  });

  it("should trigger instant interruption in GeminiLiveProvider", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready" }),
    } as any);

    const provider = new GeminiLiveProvider();
    await provider.connect({ sessionId: "vses_interrupt_test" });

    const states: string[] = [];
    provider.onStateChange((st) => states.push(st));

    await provider.interrupt();
    expect(states).toContain("INTERRUPTED");
  });

  it("should send audio chunks through connected GeminiLiveProvider", async () => {
    let fetchBody: any = null;
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      if (init?.method === "POST") {
        fetchBody = JSON.parse(init.body as string);
        return {
          ok: true,
          json: async () => ({ transcript: "Hello ELMO", isFinal: true }),
        } as any;
      }
      return {
        ok: true,
        json: async () => ({ status: "ready" }),
      } as any;
    });

    const provider = new GeminiLiveProvider();
    await provider.connect({ sessionId: "vses_audio_test" });

    const transcripts: string[] = [];
    provider.onTranscript((event) => transcripts.push(event.transcript));

    const chunk: RealtimeVoiceChunk = {
      data: new Float32Array([0.1, 0.2, 0.3]),
      timestamp: Date.now(),
    };

    await provider.sendAudioChunk(chunk);
    expect(transcripts).toContain("Hello ELMO");
    expect(fetchBody?.sessionId).toBe("vses_audio_test");
  });

  it("should initialize and disconnect BrowserRealtimeVoiceProvider cleanly", async () => {
    const provider = new BrowserRealtimeVoiceProvider();
    expect(provider.isConnected()).toBe(false);

    const states: string[] = [];
    provider.onStateChange((st) => states.push(st));

    await provider.connect();
    expect(provider.isConnected()).toBe(true);
    expect(states).toContain("LISTENING");

    await provider.interrupt();
    expect(states).toContain("INTERRUPTED");

    await provider.disconnect();
    expect(provider.isConnected()).toBe(false);
    expect(states).toContain("STANDBY");
  });
});
