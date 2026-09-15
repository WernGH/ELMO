"use client";

import { Target } from "lucide-react";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

export default function GoalsPage() {
  return (
    <ComingSoonView
      title="Autonomous Goals"
      subtitle="Strategic business objectives set by the Human Owner for ELMO AI CEO to accomplish."
      icon={Target}
      featuresPreview={[
        "Strategic Objective Mapping: Define KPIs, revenue targets, marketing campaign goals, or technical deliverables.",
        "Proactive Milestone Execution: ELMO autonomously plans intermediate steps and schedules workforce allocations.",
        "Self-Correcting Strategy: When a tactic fails, ELMO evaluates alternatives and pivots the plan automatically.",
        "Executive Progress Dashboards: Regular automated briefings delivered to the Owner on goal status.",
      ]}
    />
  );
}
