"use client";

import { Boxes } from "lucide-react";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

export default function IntegrationsPage() {
  return (
    <ComingSoonView
      title="Omnichannel & Tool Integrations"
      subtitle="Connect customer communication channels, enterprise tools, and business software."
      icon={Boxes}
      featuresPreview={[
        "Customer Messaging Channels: WhatsApp Business, Facebook Messenger, and Instagram Direct API adapters.",
        "Productivity & Operations: Google / Outlook Calendar scheduling, corporate Email dispatch & inbound triage.",
        "Enterprise CRM Sync: HubSpot, Salesforce, and custom CRM bidirectional pipeline synchronization.",
        "Voice & Real-Time Audio: Interactive AI voice agents for phone calls and audio customer support.",
      ]}
    />
  );
}
