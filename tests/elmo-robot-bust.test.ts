import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ROBOT_BUST_STATES, ELMORobotState } from "@/components/ui/ELMORobotBust";
import { ELMOConversationService } from "@/services/chat.service";

describe("ELMO Phase 3: Replacement Architecture Suite", () => {
  describe("1. ELMORobotBust Replacement with Floating AI Core", () => {
    it("must replace humanoid robotic bust with Floating AI Core and eliminate humanoid body geometry", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/ui/ELMORobotBust.tsx"
      );
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Verify Floating AI Core integration
      expect(content).toContain("ElmoCore");
      expect(content).toContain("mapRobotStateToVoiceState");

      // Verify complete elimination of humanoid robotic anatomy
      expect(content).not.toContain("id=\"humanoid-head\"");
      expect(content).not.toContain("id=\"neck-structure\"");
      expect(content).not.toContain("id=\"shoulders-and-chest\"");
      expect(content).not.toContain("id=\"chest-power-core\"");

      // Verify strictly NO cartoon/mascot/character
      expect(content.toLowerCase()).not.toContain("cartoon");
      expect(content.toLowerCase()).not.toContain("mascot");
    });

    it("must support all required operational states in ROBOT_BUST_STATES", () => {
      const requiredStates: ELMORobotState[] = [
        "IDLE",
        "STANDBY",
        "LISTENING",
        "USER_SPEAKING",
        "PROCESSING",
        "ELMO_SPEAKING",
        "INTERRUPTED",
        "SUCCESS",
        "WARNING",
        "ERROR",
      ];

      requiredStates.forEach((st) => {
        expect(ROBOT_BUST_STATES[st]).toBeDefined();
        expect(ROBOT_BUST_STATES[st].label).toBeTruthy();
        expect(ROBOT_BUST_STATES[st].subtext).toBeTruthy();
        expect(ROBOT_BUST_STATES[st].color).toBeTruthy();
        expect(ROBOT_BUST_STATES[st].glow).toBeTruthy();
      });
    });

    it("must render ElmoCore with normalized sizes", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/ui/ELMORobotBust.tsx"
      );
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).toContain("mapSizeToCoreSize");
      expect(content).toContain("<ElmoCore");
    });
  });

  describe("2. Provider Abstractions & Service Layer Architecture", () => {
    it("must export ELMOConversationService from chat.service.ts", () => {
      expect(ELMOConversationService).toBeDefined();
      expect(typeof ELMOConversationService.getInstance).toBe("function");
    });

    it("must provide SpeechToTextProvider, TextToSpeechProvider, and VoiceActivityProvider interfaces", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/services/voice/voice.types.ts"
      );
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain("export interface SpeechToTextProvider");
      expect(content).toContain("export interface TextToSpeechProvider");
      expect(content).toContain("export interface VoiceActivityProvider");
      expect(content).toContain("export interface VADConfig");
      expect(content).toContain("export interface VoiceConfig");
    });
  });

  describe("3. Modular Component Architecture (Section 22 Requirements)", () => {
    const requiredComponentFiles = [
      "src/components/ui/ELMORobotBust.tsx",
      "src/components/ui/ELMOHolographicRing.tsx",
      "src/components/ui/ELMOStatusIndicator.tsx",
      "src/components/ui/ELMODataPanel.tsx",
      "src/components/ui/ELMOTransition.tsx",
      "src/components/voice/ELMOAudioVisualizer.tsx",
      "src/components/voice/ELMOSpeakMode.tsx",
      "src/components/voice/ELMOVoiceStatus.tsx",
      "src/components/voice/ELMOVoiceControls.tsx",
      "src/components/voice/ELMOChat.tsx",
      "src/components/voice/ELMOTranscript.tsx",
      "src/components/dashboard/ELMOCommandCenter.tsx",
      "src/components/dashboard/ELMODashboard.tsx",
    ];

    requiredComponentFiles.forEach((relPath) => {
      it(`must have created component file: ${relPath}`, () => {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });
  });

  describe("4. Dashboard Command Center & TALK TO ELMO Transition", () => {
    it("ELMOCommandCenter must include status READY, prompt question, and TALK TO ELMO button", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/dashboard/ELMOCommandCenter.tsx"
      );
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain("ELMO COMMAND CENTER");
      expect(content).toContain("READY");
      expect(content).toContain("How can I help you today?");
      expect(content).toContain("TALK TO ELMO");
      expect(content).toContain("id=\"talk-to-elmo-btn\"");
    });

    it("overview/page.tsx must have prominent TALK TO ELMO trigger that opens Speak Mode", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/app/(dashboard)/overview/page.tsx"
      );
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain("TALK TO ELMO");
      expect(content).toContain("setIsFullScreenSpeakOpen(true)");
      expect(content).toContain("FullScreenSpeakMode");
    });
  });

  describe("5. Zero Forbidden Terms Compliance", () => {
    const forbiddenTerms = [
      "JARVIS",
      "Jarvis",
      "ELMO CEO",
      "AI CEO",
      "CEO Dashboard",
      "CEO Brain",
      "CEO's Superior",
    ];

    const sourceFilesToCheck = [
      "src/components/ui/ELMORobotBust.tsx",
      "src/components/ui/ELMOHolographicRing.tsx",
      "src/components/ui/ELMOStatusIndicator.tsx",
      "src/components/ui/ELMODataPanel.tsx",
      "src/components/ui/ELMOTransition.tsx",
      "src/components/voice/ELMOAudioVisualizer.tsx",
      "src/components/voice/ELMOSpeakMode.tsx",
      "src/components/voice/ELMOVoiceStatus.tsx",
      "src/components/voice/ELMOVoiceControls.tsx",
      "src/components/voice/ELMOChat.tsx",
      "src/components/voice/ELMOTranscript.tsx",
      "src/components/dashboard/ELMOCommandCenter.tsx",
      "src/components/dashboard/ELMODashboard.tsx",
    ];

    sourceFilesToCheck.forEach((relPath) => {
      it(`must NOT contain any forbidden terms in ${relPath}`, () => {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, "utf-8");

        forbiddenTerms.forEach((term) => {
          expect(content).not.toContain(term);
        });
      });
    });
  });
});
