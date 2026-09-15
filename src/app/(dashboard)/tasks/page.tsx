"use client";

import { CheckSquare } from "lucide-react";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

export default function TasksPage() {
  return (
    <ComingSoonView
      title="Workforce Task Pipeline"
      subtitle="Operational work items delegated by ELMO to specialist employees."
      icon={CheckSquare}
      featuresPreview={[
        "Automated Task Decomposition: ELMO breaks high-level goals into granular, dependency-linked tasks.",
        "Live Execution Tracking: Monitor streaming outputs, tool calls, and error recoveries in real-time.",
        "Output Artifact Verification: Every completed task produces inspectable artifacts and code deliverables.",
        "Human Escalation Routing: Tasks that exceed risk bounds automatically pause for Owner review.",
      ]}
    />
  );
}
