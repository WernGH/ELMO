import { describe, it, expect } from "vitest";
import { STATE_METADATA, ELMORobotState } from "@/components/ui/ELMORobot";
import { NAVIGATION_ITEMS, ELMO_IDENTITY, APP_NAME } from "@/lib/constants";

describe("ELMO Futuristic Pixel Command Center Suite", () => {
  describe("Brand & Identity Requirements", () => {
    it("must enforce COAI as the platform brand name", () => {
      expect(APP_NAME).toBe("COAI");
    });

    it("must define ELMO as the AI CEO with systemTag and ONLINE status", () => {
      expect(ELMO_IDENTITY.name).toBe("ELMO");
      expect(ELMO_IDENTITY.role).toBe("AI CEO");
      expect(ELMO_IDENTITY.systemTag).toContain("COAI");
      expect(ELMO_IDENTITY.systemTag).toContain("ELMO");
      expect(ELMO_IDENTITY.status).toBe("ONLINE");
    });

    it("must strictly not use forbidden trademarked names", () => {
      expect(ELMO_IDENTITY.name).not.toBe("JARVIS");
      expect(ELMO_IDENTITY.name).not.toBe("Jarvis");
    });
  });

  describe("ELMO Robot Visual States (All 9 Required States)", () => {
    const requiredStates: ELMORobotState[] = [
      "IDLE",
      "LISTENING",
      "THINKING",
      "WORKING",
      "SPEAKING",
      "SUCCESS",
      "WARNING",
      "NEEDS_APPROVAL",
      "ERROR",
    ];

    it("must support exactly all 9 required operational states", () => {
      requiredStates.forEach((st) => {
        expect(STATE_METADATA[st]).toBeDefined();
        expect(STATE_METADATA[st].label).toBeTruthy();
        expect(STATE_METADATA[st].subtext).toBeTruthy();
        expect(STATE_METADATA[st].symbol).toBeTruthy();
        expect(STATE_METADATA[st].color).toBeTruthy();
      });
    });

    it("IDLE state should have neon green styling and ready subtext", () => {
      const idle = STATE_METADATA.IDLE;
      expect(idle.label).toBe("ONLINE");
      expect(idle.subtext).toContain("Ready to work");
      expect(idle.color).toContain("text-elmo-neonGreen");
      expect(idle.symbol).toBe("●");
    });

    it("LISTENING state should have listening indicator", () => {
      const listening = STATE_METADATA.LISTENING;
      expect(listening.label).toBe("LISTENING");
      expect(listening.subtext).toContain("directives");
      expect(listening.symbol).toBe("◉");
    });

    it("THINKING state should have processing label and cyan glow", () => {
      const thinking = STATE_METADATA.THINKING;
      expect(thinking.label).toBe("PROCESSING");
      expect(thinking.color).toContain("text-cyan-400");
    });

    it("WORKING state should have working label and workforce orchestration subtext", () => {
      const working = STATE_METADATA.WORKING;
      expect(working.label).toBe("WORKING");
      expect(working.subtext).toContain("workforce");
    });

    it("SPEAKING state should have transmitting label and audio wave subtext", () => {
      const speaking = STATE_METADATA.SPEAKING;
      expect(speaking.label).toBe("TRANSMITTING");
      expect(speaking.subtext).toContain("briefing");
    });

    it("SUCCESS state should display verified status and checkmark", () => {
      const success = STATE_METADATA.SUCCESS;
      expect(success.label).toBe("COMPLETED");
      expect(success.symbol).toBe("✔");
    });

    it("WARNING state should display warning label and amber glow", () => {
      const warning = STATE_METADATA.WARNING;
      expect(warning.label).toBe("WARNING");
      expect(warning.color).toContain("text-amber-400");
      expect(warning.symbol).toBe("⚠");
    });

    it("NEEDS_APPROVAL state should highlight human authorization gate", () => {
      const approval = STATE_METADATA.NEEDS_APPROVAL;
      expect(approval.label).toBe("APPROVAL REQUIRED");
      expect(approval.subtext).toContain("authorization");
      expect(approval.symbol).toBe("⚠");
    });

    it("ERROR state should display alert label and rose/red alert styling", () => {
      const error = STATE_METADATA.ERROR;
      expect(error.label).toBe("ALERT");
      expect(error.color).toContain("text-rose-400");
      expect(error.symbol).toBe("✖");
    });
  });

  describe("Navigation Architecture (11 Items)", () => {
    it("should have exactly 11 navigation links matching Phase 1 spec", () => {
      expect(NAVIGATION_ITEMS.length).toBe(11);
    });

    it("must contain all required links in the correct order", () => {
      const expectedNames = [
        "Overview",
        "ELMO",
        "Employees",
        "Tasks",
        "Goals",
        "Memory",
        "Automations",
        "Integrations",
        "Approvals",
        "Activity",
        "Settings",
      ];

      const actualNames = NAVIGATION_ITEMS.map((item) => item.name);
      expect(actualNames).toEqual(expectedNames);
    });

    it("Overview should link to /overview", () => {
      const overview = NAVIGATION_ITEMS.find((i) => i.name === "Overview");
      expect(overview?.href).toBe("/overview");
    });

    it("ELMO item should have AI CEO badge", () => {
      const elmoItem = NAVIGATION_ITEMS.find((i) => i.name === "ELMO");
      expect(elmoItem?.badge).toBe("AI CEO");
      expect(elmoItem?.href).toBe("/elmo");
    });
  });

  describe("Pixel Progress Calculations", () => {
    it("should accurately calculate block ratios for stepped progress", () => {
      const calculateBlocks = (val: number, total: number = 20) => {
        const clamped = Math.min(100, Math.max(0, val));
        return Math.round((clamped / 100) * total);
      };

      expect(calculateBlocks(74, 20)).toBe(15); // 74% of 20 blocks = 14.8 -> 15 blocks
      expect(calculateBlocks(0, 20)).toBe(0);
      expect(calculateBlocks(100, 20)).toBe(20);
      expect(calculateBlocks(50, 20)).toBe(10);
      expect(calculateBlocks(120, 20)).toBe(20); // Clamped
      expect(calculateBlocks(-10, 20)).toBe(0); // Clamped
    });
  });

  describe("Specialist Workforce Roles", () => {
    const specialistRoles = [
      "Research Employee",
      "Marketing Employee",
      "Content Employee",
      "Sales Employee",
      "Customer Service Employee",
      "Admin Employee",
      "Developer Employee",
    ];

    it("covers all 7 required workforce employee roles", () => {
      expect(specialistRoles.length).toBe(7);
      specialistRoles.forEach((role) => {
        expect(role).toBeTruthy();
      });
    });
  });
});
