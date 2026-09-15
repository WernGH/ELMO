"use client";

import { Users } from "lucide-react";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

export default function EmployeesPage() {
  return (
    <ComingSoonView
      title="Specialist AI Employees"
      subtitle="Autonomous AI specialists managed by ELMO (AI CEO) to execute business domains."
      icon={Users}
      featuresPreview={[
        "Domain Specialist Rosters: Engineering, Marketing, Sales, Operations, Finance, and Customer Support.",
        "Agent-to-Agent Collaboration: Specialist employees will communicate with ELMO and each other via structured message protocols.",
        "Skill & Tool Provisioning: Assign tools (web browsing, API callers, CRM connectors) to specific AI employees.",
        "Autonomy & Escalation Thresholds: Define when employees can autonomously take actions versus when they must seek ELMO or Owner approval.",
      ]}
    />
  );
}
