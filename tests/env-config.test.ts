import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { getClientEnv, getServerEnv, validateEnv } from "@/config/env";

describe("ELMO Phase 3: Environment Variable & Security Configuration Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. Required Environment Detection & Configuration", () => {
    it("should detect required Supabase and App variables", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

      const client = getClientEnv();
      expect(client.supabaseUrl).toBe("https://test.supabase.co");
      expect(client.supabaseAnonKey).toBe("test-anon-key");
      expect(client.appUrl).toBe("http://localhost:3000");
    });

    it("should validate environment and report Supabase status", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "real-anon-key-12345";

      const res = validateEnv();
      expect(res.features.supabaseConfigured).toBe(true);
      expect(res.isValid).toBe(true);
    });
  });

  describe("2. Missing Gemini Configuration Handling", () => {
    it("should produce a clear warning and not crash when GEMINI_API_KEY is missing", () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_GENAI_API_KEY;

      const res = validateEnv();
      expect(res.features.geminiConfigured).toBe(false);
      expect(res.warnings.some((w) => w.includes("GEMINI_API_KEY"))).toBe(true);
      // System remains valid and usable with fallback intelligence
      expect(res.isValid).toBe(true);
    });

    it("should recognize when GEMINI_API_KEY is configured", () => {
      process.env.GEMINI_API_KEY = "AIzaSyTestKeyForGemini1234567";

      const res = validateEnv();
      expect(res.features.geminiConfigured).toBe(true);
    });
  });

  describe("3. Voice Enable/Disable Safety", () => {
    it("should allow disabling voice via VOICE_ENABLED=false without crashing", () => {
      process.env.VOICE_ENABLED = "false";
      process.env.NEXT_PUBLIC_VOICE_ENABLED = "false";

      const client = getClientEnv();
      expect(client.voiceEnabled).toBe(false);

      const res = validateEnv();
      expect(res.features.voiceEnabled).toBe(false);
      expect(res.isValid).toBe(true);
    });

    it("should default voiceEnabled to true when not explicitly disabled", () => {
      delete process.env.VOICE_ENABLED;
      delete process.env.NEXT_PUBLIC_VOICE_ENABLED;

      const client = getClientEnv();
      expect(client.voiceEnabled).toBe(true);
    });
  });

  describe("4. Missing Optional Voice Provider Configuration Resilience", () => {
    it("should fallback to browser defaults when STT and TTS provider keys are absent", () => {
      delete process.env.VOICE_STT_API_KEY;
      delete process.env.VOICE_STT_API_URL;
      delete process.env.VOICE_TTS_API_KEY;
      delete process.env.VOICE_TTS_API_URL;

      const server = getServerEnv();
      expect(server.voiceSttProvider).toBe("browser");
      expect(server.voiceTtsProvider).toBe("browser");
      expect(server.voiceVadProvider).toBe("browser");
      expect(server.voiceSttApiKey).toBeUndefined();
      expect(server.voiceTtsApiKey).toBeUndefined();

      const validation = validateEnv();
      expect(validation.isValid).toBe(true);
      expect(validation.features.customSttConfigured).toBe(false);
      expect(validation.features.customTtsConfigured).toBe(false);
    });
  });

  describe("5. Client-Side Security & Secret Isolation", () => {
    it("getClientEnv must never return server-side secrets", () => {
      process.env.GEMINI_API_KEY = "secret-gemini-key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-service-role-key";
      process.env.VOICE_STT_API_KEY = "secret-stt-key";
      process.env.VOICE_TTS_API_KEY = "secret-tts-key";

      const client = getClientEnv();
      expect((client as any).geminiApiKey).toBeUndefined();
      expect((client as any).supabaseServiceRoleKey).toBeUndefined();
      expect((client as any).voiceSttApiKey).toBeUndefined();
      expect((client as any).voiceTtsApiKey).toBeUndefined();
    });

    it("getServerEnv must throw an error if called in a browser window environment", () => {
      (global as any).window = {};
      try {
        expect(() => getServerEnv()).toThrow(/Security Violation/);
      } finally {
        delete (global as any).window;
      }
    });

    it("NEXT_PUBLIC_* must be used only for safe public configuration", () => {
      const publicPrefix = "NEXT_PUBLIC_";
      const sensitiveNames = ["SECRET", "SERVICE_ROLE", "GEMINI_API_KEY", "STT_API_KEY", "TTS_API_KEY", "PASSWORD"];

      Object.keys(process.env).forEach((key) => {
        if (key.startsWith(publicPrefix)) {
          sensitiveNames.forEach((sens) => {
            expect(key.toUpperCase()).not.toContain(sens);
          });
        }
      });
    });
  });

  describe("6. Version Control Safety (.gitignore & .env.example)", () => {
    it(".gitignore must exist and ignore .env.local", () => {
      const gitignorePath = path.join(process.cwd(), ".gitignore");
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, "utf-8");
      expect(content).toContain(".env.local");
      expect(content).toContain(".env*.local");
    });

    it(".env.example must exist and contain NO real secrets or private credentials", () => {
      const envExamplePath = path.join(process.cwd(), ".env.example");
      expect(fs.existsSync(envExamplePath)).toBe(true);
      const content = fs.readFileSync(envExamplePath, "utf-8");

      // Verify all required sections exist
      expect(content).toContain("NEXT_PUBLIC_SUPABASE_URL=");
      expect(content).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=");
      expect(content).toContain("SUPABASE_SERVICE_ROLE_KEY=");
      expect(content).toContain("GEMINI_API_KEY=");
      expect(content).toContain("VOICE_ENABLED=true");
      expect(content).toContain("VOICE_VAD_PROVIDER=browser");
      expect(content).toContain("VOICE_STT_API_KEY=");
      expect(content).toContain("VOICE_TTS_API_KEY=");
      expect(content).toContain("NEXT_PUBLIC_APP_URL=");

      // Verify NO real credentials
      expect(content).not.toContain("AIzaSy");
      expect(content).not.toContain("eyJhbGciOi");
      expect(content).not.toMatch(/GEMINI_API_KEY=\S+/);
      expect(content).not.toMatch(/VOICE_STT_API_KEY=\S+/);
      expect(content).not.toMatch(/VOICE_TTS_API_KEY=\S+/);
    });
  });
});
