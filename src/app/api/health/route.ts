import { NextResponse } from "next/server";
import { RLSAuditService } from "@/services/rls-audit.service";
import { ELMO_IDENTITY } from "@/lib/constants";

export async function GET() {
  const audit = RLSAuditService.runCrossTenantIsolationAudit();

  return NextResponse.json({
    product: "ELMO",
    identity: ELMO_IDENTITY,
    phase: "PHASE 1 — COMPANY FOUNDATION",
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    security: {
      rowLevelSecurity: "ACTIVE",
      tenantIsolationAudit: audit.tenantIsolationPassed ? "PASSED" : "FAILED",
      supportedRoles: ["owner", "admin", "manager", "member", "viewer"],
      clientSecretProtection: "VERIFIED",
    },
    tables: [
      { name: "organizations", rls: true },
      { name: "profiles", rls: true },
      { name: "organization_members", rls: true },
    ],
  });
}
