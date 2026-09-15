"use client";

import { Activity } from "lucide-react";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

export default function ActivityPage() {
  return (
    <ComingSoonView
      title="Company Activity & Audit Log"
      subtitle="Comprehensive audit trail of all AI workforce actions, communications, and system events."
      icon={Activity}
      featuresPreview={[
        "Immutable Audit Logs: Real-time event stream of every decision ELMO makes and every tool an employee executes.",
        "Security & Compliance Inspector: Track data access, RLS query evaluations, and tenant boundaries.",
        "Agent-to-Agent Message Tracing: Deep visibility into inter-agent collaboration dialogues and task handoffs.",
        "Performance & Cost Telemetry: Token consumption, latency metrics, and API cost analytics across all agents.",
      ]}
    />
  );
}
