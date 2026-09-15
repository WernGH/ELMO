import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  ElmoCore,
  ElmoInnerCore,
  ElmoNeuralStructure,
  ElmoOuterShell,
  ElmoOrbitalRings,
  ElmoParticles,
  CORE_STATE_METADATA,
} from "@/components/elmo";
import { VoiceState } from "@/services/voice/voice.types";

describe("ELMO Phase 3: Floating AI Core Visual Identity & Architecture Suite", () => {
  describe("1. Official Visual Identity & Abstract Intelligence Specification", () => {
    it("must export all modular components of the Floating AI Core", () => {
      expect(ElmoCore).toBeDefined();
      expect(ElmoInnerCore).toBeDefined();
      expect(ElmoNeuralStructure).toBeDefined();
      expect(ElmoOuterShell).toBeDefined();
      expect(ElmoOrbitalRings).toBeDefined();
      expect(ElmoParticles).toBeDefined();
    });

    it("ElmoCore component must embody abstract spherical intelligence, strictly not mascot/character", () => {
      const corePath = path.join(process.cwd(), "src/components/elmo/ElmoCore.tsx");
      expect(fs.existsSync(corePath)).toBe(true);
      const content = fs.readFileSync(corePath, "utf-8");

      expect(content).toContain("data-testid=\"elmo-floating-ai-core\"");
      expect(content).toContain("ElmoInnerCore");
      expect(content).toContain("ElmoNeuralStructure");
      expect(content).toContain("ElmoOuterShell");
      expect(content).toContain("ElmoOrbitalRings");
      expect(content).toContain("ElmoParticles");

      // Verify no humanoid mascot/cartoon/character terms in core definition
      expect(content.toLowerCase()).not.toContain("mascot");
      expect(content.toLowerCase()).not.toContain("character");
      expect(content.toLowerCase()).not.toContain("cartoon");
    });
  });

  describe("2. Canonical Voice States & Color System", () => {
    const requiredStates: VoiceState[] = [
      "STANDBY",
      "LISTENING",
      "USER_SPEAKING",
      "PROCESSING",
      "ELMO_SPEAKING",
      "INTERRUPTED",
      "RECONNECTING",
      "ERROR",
    ];

    it("must define metadata for all 8 canonical states in CORE_STATE_METADATA", () => {
      requiredStates.forEach((st) => {
        expect(CORE_STATE_METADATA[st]).toBeDefined();
        expect(CORE_STATE_METADATA[st].label).toBeTruthy();
        expect(CORE_STATE_METADATA[st].subtext).toBeTruthy();
        expect(CORE_STATE_METADATA[st].glowColor).toBeTruthy();
        expect(CORE_STATE_METADATA[st].statusBadge).toBeTruthy();
      });
    });

    it("must enforce official blue energy color palette (electric blue, bright cyan, deep graphite)", () => {
      const innerCorePath = path.join(process.cwd(), "src/components/elmo/ElmoInnerCore.tsx");
      const content = fs.readFileSync(innerCorePath, "utf-8");

      // Electric blue and cyan-white stops
      expect(content).toContain("#00D2FF");
      expect(content).toContain("#0066FF");
      expect(content).toContain("#FFFFFF");
    });
  });

  describe("3. Multi-Layer Core Form & Performance", () => {
    it("ElmoInnerCore must handle real-time audio reactivity from RMS levels", () => {
      const innerCorePath = path.join(process.cwd(), "src/components/elmo/ElmoInnerCore.tsx");
      const content = fs.readFileSync(innerCorePath, "utf-8");

      expect(content).toContain("audioLevel");
      expect(content).toContain("audioScale");
      expect(content).toContain("audioGlow");
      expect(content).toContain("data-testid=\"elmo-inner-core\"");
    });

    it("ElmoNeuralStructure must generate interconnected synaptic nodes and computing edges", () => {
      const neuralPath = path.join(process.cwd(), "src/components/elmo/ElmoNeuralStructure.tsx");
      const content = fs.readFileSync(neuralPath, "utf-8");

      expect(content).toContain("data-testid=\"elmo-neural-structure\"");
      expect(content).toContain("nodes");
      expect(content).toContain("edges");
      expect(content).toContain("motion-reduce:animate-none");
    });

    it("ElmoOuterShell must include subtle geodesic rings and telemetry cardinal ticks", () => {
      const shellPath = path.join(process.cwd(), "src/components/elmo/ElmoOuterShell.tsx");
      const content = fs.readFileSync(shellPath, "utf-8");

      expect(content).toContain("data-testid=\"elmo-outer-shell\"");
      expect(content).toContain("strokeDasharray");
      expect(content).toContain("motion-reduce:animate-none");
    });

    it("ElmoOrbitalRings must include counter-rotating multi-inclined elliptical holographic rings", () => {
      const ringsPath = path.join(process.cwd(), "src/components/elmo/ElmoOrbitalRings.tsx");
      const content = fs.readFileSync(ringsPath, "utf-8");

      expect(content).toContain("data-testid=\"elmo-orbital-rings\"");
      expect(content).toContain("rotate(-25)");
      expect(content).toContain("rotate(35)");
      expect(content).toContain("motion-reduce:animate-none");
    });

    it("ElmoParticles must render subtle orbiting particles with reduced motion support", () => {
      const particlesPath = path.join(process.cwd(), "src/components/elmo/ElmoParticles.tsx");
      const content = fs.readFileSync(particlesPath, "utf-8");

      expect(content).toContain("data-testid=\"elmo-particles\"");
      expect(content).toContain("particles");
      expect(content).toContain("motion-reduce:animate-none");
    });
  });

  describe("4. Dashboard & Speak Mode Integration", () => {
    it("ELMOCommandCenter must feature the compact Floating AI Core on the dashboard", () => {
      const ccPath = path.join(
        process.cwd(),
        "src/components/dashboard/ELMOCommandCenter.tsx"
      );
      const content = fs.readFileSync(ccPath, "utf-8");

      expect(content).toContain("<ElmoCore");
      expect(content).toContain("size=\"sm\"");
      expect(content).toContain("TALK TO ELMO");
    });

    it("FullScreenSpeakMode must feature the full Floating AI Core as the primary visual focus", () => {
      const smPath = path.join(
        process.cwd(),
        "src/components/voice/FullScreenSpeakMode.tsx"
      );
      const content = fs.readFileSync(smPath, "utf-8");

      expect(content).toContain("<ElmoCore");
      expect(content).toContain("size=\"full\"");
      expect(content).toContain("audioLevel={audioLevel}");
    });

    it("ElmoCore must provide extensible workforce sockets anchor for future Phase 4 expansion", () => {
      const corePath = path.join(process.cwd(), "src/components/elmo/ElmoCore.tsx");
      const content = fs.readFileSync(corePath, "utf-8");

      expect(content).toContain("enableWorkforceSockets");
      expect(content).toContain("data-testid=\"workforce-sockets-anchor\"");
    });
  });
});
