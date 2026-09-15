"use client";

import { Zap } from "lucide-react";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

export default function AutomationsPage() {
  return (
    <ComingSoonView
      title="Autonomous Workflows"
      subtitle="Event-driven business triggers and unattended background workflows."
      icon={Zap}
      featuresPreview={[
        "Multi-Step Autonomous Pipelines: Trigger multi-agent workflows based on inbound customer messages, leads, or cron schedules.",
        "Conditional Logic & Guardrails: Built-in safety limits, budget maximums, and policy checks.",
        "Webhook & Event Ingestion: Connect webhooks from Shopify, Stripe, GitHub, or any cloud service to trigger workforce actions.",
        "Autonomous Incident Recovery: Self-healing workflows that detect errors and assign specialist debugging agents.",
      ]}
    />
  );
}
