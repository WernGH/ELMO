"use client";

import React, { useState } from "react";
import { ELMOCommandCenter } from "./ELMOCommandCenter";
import { BottomOverviewArea } from "./BottomOverviewArea";
import { ELMOSpeakMode } from "@/components/voice/ELMOSpeakMode";
import { ConversationMessage } from "@/components/voice/LiveConversationPanel";
import { VoiceState } from "@/services/voice/voice.types";

export interface ELMODashboardProps {
  organizationId?: string;
  userId?: string;
  initialMessages?: ConversationMessage[];
  className?: string;
}

export function ELMODashboard({
  organizationId,
  userId,
  initialMessages = [],
  className,
}: ELMODashboardProps) {
  const [isSpeakModeOpen, setIsSpeakModeOpen] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [robotState, setRobotState] = useState<VoiceState>("STANDBY");

  return (
    <div className={className}>
      {/* ELMO Command Center Header & Interactive Panel */}
      <ELMOCommandCenter
        status="READY"
        robotState={robotState}
        onEnterSpeakMode={() => setIsSpeakModeOpen(true)}
        className="mb-8"
      />

      {/* Overview Metrics & Telemetry Area */}
      <BottomOverviewArea />

      {/* Full-Screen Immersive Speak Mode Modal */}
      <ELMOSpeakMode
        isOpen={isSpeakModeOpen}
        onClose={() => setIsSpeakModeOpen(false)}
        initialMessages={messages}
        organizationId={organizationId}
        userId={userId}
      />
    </div>
  );
}
