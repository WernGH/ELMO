"use client";

import { ShieldAlert } from "lucide-react";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

export default function ApprovalsPage() {
  return (
    <ComingSoonView
      title="Executive Approvals (Human-in-the-Loop)"
      subtitle="Critical decisions, financial expenditures, and high-impact actions escalated to the Human Owner."
      icon={ShieldAlert}
      featuresPreview={[
        "Executive Authority Gateway: Actions exceeding configured risk, financial, or reputation thresholds require owner sign-off.",
        "One-Click Context Briefings: ELMO provides a distilled summary, expected ROI, risk assessment, and recommended decision.",
        "Delegated Manager Authorizations: Configurable authorization tiers allowing managers to approve sub-$500 expenses.",
        "Audit Trail & Nonce Verification: Cryptographically verifiable records of who authorized each real-world action.",
      ]}
    />
  );
}
