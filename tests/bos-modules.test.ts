/**
 * ELMO Integration Test Suite — COAI B.O.S Modules
 *
 * Validates:
 * 1. B.O.S Two-Phase Arming Safety Gate (BosArmControlService)
 * 2. B.O.S Tenant Brand & Business Profile Seeder (BosBrandConfigService)
 * 3. B.O.S Outbound Drip & Exclusion Playbooks (BosDripPlaybooksService)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BosArmControlService, BosUnarmedActionError } from "@/services/bos/bos-arm-control.service";
import { BosBrandConfigService } from "@/services/bos/bos-brand-config.service";
import { BosDripPlaybooksService } from "@/services/bos/bos-drip-playbooks.service";
import { CompanyBrainService } from "@/services/company-brain.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("COAI B.O.S Modules Integrated into ELMO", () => {
  const armControl = BosArmControlService.getInstance();
  const brandConfig = BosBrandConfigService.getInstance();
  const dripPlaybooks = BosDripPlaybooksService.getInstance();
  const companyBrain = CompanyBrainService.getInstance();
  const store = MockDataStore.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    armControl.reset();
    dripPlaybooks.clearCustomExclusions();
    store.reset();

    // Setup mock organization and membership
    store.organizations.set(orgId, {
      id: orgId,
      name: "Apex AI Solutions",
      slug: "apex-ai",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    store.organizationMembers.set(`m_${userId}_${orgId}`, {
      id: `m_${userId}_${orgId}`,
      organization_id: orgId,
      user_id: userId,
      role: "owner",
      created_at: new Date().toISOString(),
    });
  });

  describe("1. B.O.S Two-Phase Arming Safety Gate (BosArmControlService)", () => {
    it("should default to DISARMED and throw BosUnarmedActionError on high-risk execution", () => {
      expect(armControl.isArmed(orgId, "EMAIL_BLAST")).toBe(false);

      expect(() => {
        armControl.assertArmed(orgId, "EMAIL_BLAST");
      }).toThrow(BosUnarmedActionError);
    });

    it("should allow high-risk execution once explicitly ARMED with a valid token", () => {
      const token = armControl.armAction(orgId, "EMAIL_BLAST", userId, 120);

      expect(token.token.startsWith("arm_")).toBe(true);
      expect(token.organizationId).toBe(orgId);
      expect(armControl.isArmed(orgId, "EMAIL_BLAST")).toBe(true);

      // Should not throw
      expect(() => {
        armControl.assertArmed(orgId, "EMAIL_BLAST");
      }).not.toThrow();
    });

    it("should return to safe simulation when disarmAction is called", () => {
      armControl.armAction(orgId, "DNS_PUBLISH", userId, 300);
      expect(armControl.isArmed(orgId, "DNS_PUBLISH")).toBe(true);

      armControl.disarmAction(orgId, "DNS_PUBLISH");
      expect(armControl.isArmed(orgId, "DNS_PUBLISH")).toBe(false);

      expect(() => {
        armControl.assertArmed(orgId, "DNS_PUBLISH");
      }).toThrow(BosUnarmedActionError);
    });

    it("should expire arming tokens after TTL", () => {
      // Arm with 0 seconds TTL (already expired)
      armControl.armAction(orgId, "FINANCIAL_PAYOUT", userId, -1);
      expect(armControl.isArmed(orgId, "FINANCIAL_PAYOUT")).toBe(false);
    });
  });

  describe("2. B.O.S Tenant Brand & Profile Seeder (BosBrandConfigService)", () => {
    it("should derive industry-appropriate color palettes", () => {
      const saasPalette = brandConfig.derivePalette("B2B SaaS Analytics");
      expect(saasPalette.primary).toBe("#6366f1"); // Indigo

      const fintechPalette = brandConfig.derivePalette("Fintech Payments");
      expect(fintechPalette.primary).toBe("#0ea5e9"); // Sky

      const diningPalette = brandConfig.derivePalette("Italian Restaurant");
      expect(diningPalette.primary).toBe("#f97316"); // Orange
    });

    it("should synthesize a structured 7-dimension BusinessProfile", () => {
      const profile = brandConfig.synthesizeProfile({
        businessName: "CloudPulse",
        industry: "SaaS & Cloud Operations",
        personality: "consultative",
      });

      expect(profile.businessName).toBe("CloudPulse");
      expect(profile.industry).toBe("SaaS & Cloud Operations");
      expect(profile.customerSegments?.length).toBeGreaterThan(0);
      expect(profile.marketing?.positioning).toContain("CloudPulse");
      expect(profile.sales?.commonObjections?.length).toBeGreaterThan(0);
      expect(profile.operations?.workflows?.length).toBeGreaterThan(0);
    });

    it("should seed brand profile and verified memory facts directly into ELMO's CompanyBrainService", async () => {
      const result = await brandConfig.seedOrganization(userId, orgId, {
        businessName: "Apex Logistics",
        industry: "Logistics & Supply Chain",
      });

      expect(result.palette.primary).toBeDefined();
      expect(result.profile.businessName).toBe("Apex Logistics");

      // Verify it was committed to ELMO's CompanyBrainService
      const savedProfile = await companyBrain.getBusinessProfile(userId, orgId);
      expect(savedProfile).not.toBeNull();
      expect(savedProfile?.businessName).toBe("Apex Logistics");
      expect(savedProfile?.marketing?.brandVoice).toContain("Consultative");
    });
  });

  describe("3. B.O.S Outbound Drip & Exclusion Playbooks (BosDripPlaybooksService)", () => {
    it("should block blacklisted, internal, and spam-trap domains", () => {
      expect(dripPlaybooks.checkExclusion("test@coai.international").allowed).toBe(false);
      expect(dripPlaybooks.checkExclusion("user@mailinator.com").allowed).toBe(false);
      expect(dripPlaybooks.checkExclusion("invalid-email").allowed).toBe(false);
    });

    it("should permit legitimate prospects", () => {
      const check = dripPlaybooks.checkExclusion("sarah.connor@hyperplane.io");
      expect(check.allowed).toBe(true);
    });

    it("should enforce custom organization exclusion rules", () => {
      dripPlaybooks.addExclusion("competitorcorp.com");
      expect(dripPlaybooks.checkExclusion("alex@competitorcorp.com").allowed).toBe(false);
    });

    it("should provide 4-touch B.O.S consultative cadences with proper delay offsets", () => {
      const playbook = dripPlaybooks.getPlaybook("b2b_sme_consultative");
      expect(playbook.steps.length).toBe(4);
      expect(playbook.steps[0].delayDays).toBe(0);
      expect(playbook.steps[1].delayDays).toBe(3);
      expect(playbook.steps[2].delayDays).toBe(7);
      expect(playbook.steps[3].delayDays).toBe(12);

      const formatted = dripPlaybooks.formatStep(playbook.steps[0], {
        firstName: "Rachel",
        companyName: "Acme Logistics",
        industry: "Freight",
        senderName: "Alex Vance",
      });

      expect(formatted.subject).toContain("Acme Logistics");
      expect(formatted.body).toContain("Rachel");
      expect(formatted.body).toContain("Freight");
    });
  });
});
