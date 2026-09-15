"use client";

import React from "react";
import { LiveConversationPanel, ConversationMessage } from "./LiveConversationPanel";
import { VoiceState } from "@/services/voice/voice.types";

export interface ELMOChatProps {
  messages: ConversationMessage[];
  voiceState: VoiceState;
  liveTranscript?: string;
  isVoiceActive: boolean;
  isPaused: boolean;
  micPermission: string;
  onToggleVoiceMode: () => void;
  onPauseVoiceMode: () => void;
  onResumeVoiceMode: () => void;
  onInterrupt: () => void;
  onToggleManualMic?: () => void;
  onSendMessage?: (text: string) => void;
  className?: string;
}

export function ELMOChat(props: ELMOChatProps) {
  return <LiveConversationPanel {...props} />;
}

export { LiveConversationPanel };
export type { ConversationMessage };
