"use client";

import React from "react";
import { FullScreenSpeakMode } from "./FullScreenSpeakMode";
import { ConversationMessage } from "./LiveConversationPanel";

export interface ELMOSpeakModeProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessages?: ConversationMessage[];
  organizationId?: string;
  userId?: string;
}

export function ELMOSpeakMode(props: ELMOSpeakModeProps) {
  return <FullScreenSpeakMode {...props} />;
}

export { FullScreenSpeakMode };
