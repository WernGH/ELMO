import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { VoiceSessionManager } from "@/services/voice/voice-session-manager";

describe("Phase 3: VoiceSessionManager — Lifecycle, Metrics & Zero Audio Persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    VoiceSessionManager.resetInstance();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate a unique session ID with vses_ prefix", () => {
    const manager = VoiceSessionManager.getInstance();
    const session = manager.startSession("org_test_123", "user_test_456", "auto");

    expect(session.id).toMatch(/^vses_\d+_[a-z0-9]+$/);
    expect(session.organizationId).toBe("org_test_123");
    expect(session.userId).toBe("user_test_456");
    expect(session.status).toBe("active");
    expect(session.userTurnsCount).toBe(0);
    expect(session.assistantTurnsCount).toBe(0);
    expect(session.interruptionCount).toBe(0);
  });

  it("should accurately track conversational turn metrics and interruptions", () => {
    const manager = VoiceSessionManager.getInstance();
    manager.startSession("org_1", "user_1");

    manager.recordUserTurn();
    manager.recordAssistantTurn();
    manager.recordUserTurn();
    manager.recordInterruption();
    manager.updateLanguage("ms");

    const active = manager.getActiveSession();
    expect(active?.userTurnsCount).toBe(2);
    expect(active?.assistantTurnsCount).toBe(1);
    expect(active?.interruptionCount).toBe(1);
    expect(active?.detectedLanguage).toBe("ms");
  });

  it("should trigger inactivity timeout callback after configured period of silence", () => {
    const onTimeout = vi.fn();
    const manager = VoiceSessionManager.getInstance({
      inactivityTimeoutMs: 5000,
      onTimeout,
    });

    manager.startSession("org_1", "user_1");
    expect(onTimeout).not.toHaveBeenCalled();

    // Fast-forward 4 seconds
    vi.advanceTimersByTime(4000);
    expect(onTimeout).not.toHaveBeenCalled();

    // Fast-forward past 5 seconds
    vi.advanceTimersByTime(1500);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("should calculate duration and mark session completed on endSession", async () => {
    const manager = VoiceSessionManager.getInstance();
    manager.startSession("org_1", "user_1");

    // Advance 12 seconds
    vi.advanceTimersByTime(12000);

    const completed = await manager.endSession("completed");
    expect(completed).not.toBeNull();
    expect(completed?.status).toBe("completed");
    expect(completed?.durationSeconds).toBe(12);
    expect(completed?.endedAt).toBeDefined();

    // Active session should now be null
    expect(manager.getActiveSession()).toBeNull();
  });

  it("should guarantee zero raw audio persistence in session objects", async () => {
    const manager = VoiceSessionManager.getInstance();
    manager.startSession("org_1", "user_1");
    manager.recordUserTurn();
    manager.recordAssistantTurn();

    const session = await manager.endSession("completed");
    expect(session).toBeDefined();

    // Verify properties: only metadata, counts, timestamps; NO audio buffers, blobs, or streams
    const keys = Object.keys(session!);
    expect(keys).not.toContain("audio");
    expect(keys).not.toContain("audioBuffer");
    expect(keys).not.toContain("rawAudio");
    expect(keys).not.toContain("stream");
    expect(keys).not.toContain("pcm");
  });
});
