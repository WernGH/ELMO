"use client";

import React from "react";
import { HolographicRings } from "./HolographicRings";
import { VoiceState } from "@/services/voice/voice.types";

export interface ELMOHolographicRingProps {
  voiceState?: VoiceState;
  className?: string;
  size?: number | string;
  responsive?: boolean;
}

export function ELMOHolographicRing(props: ELMOHolographicRingProps) {
  return <HolographicRings {...props} />;
}

export { HolographicRings };
