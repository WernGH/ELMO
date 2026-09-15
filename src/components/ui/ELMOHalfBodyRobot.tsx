"use client";

import React, { useState, useEffect } from "react";
import { ELMORobotState } from "./ELMORobotBust";
import { ElmoCore } from "@/components/elmo";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

interface ELMOHalfBodyRobotProps {
  state?: ELMORobotState;
  interactive?: boolean;
  className?: string;
  onStateChange?: (newState: ELMORobotState) => void;
}

function mapRobotStateToVoiceState(state: ELMORobotState): VoiceState {
  switch (state) {
    case "IDLE":
    case "STANDBY":
    case "SUCCESS":
      return "STANDBY";
    case "LISTENING":
      return "LISTENING";
    case "USER_SPEAKING":
      return "USER_SPEAKING";
    case "THINKING":
    case "PROCESSING":
    case "WORKING":
      return "PROCESSING";
    case "SPEAKING":
    case "ELMO_SPEAKING":
      return "ELMO_SPEAKING";
    case "INTERRUPTED":
      return "INTERRUPTED";
    case "RECONNECTING":
      return "RECONNECTING";
    case "WARNING":
    case "NEEDS_APPROVAL":
    case "ERROR":
      return "ERROR";
    default:
      return "STANDBY";
  }
}

/**
 * ELMOHalfBodyRobot (Migrated to Floating AI Core Official Identity)
 * Renders the full Floating AI Core. Strictly zero humanoid robot anatomy.
 */
export function ELMOHalfBodyRobot({
  state = "IDLE",
  interactive = false,
  className,
  onStateChange,
}: ELMOHalfBodyRobotProps) {
  const [internalState, setInternalState] = useState<ELMORobotState>(state);

  useEffect(() => {
    setInternalState(state);
  }, [state]);

  const voiceState = mapRobotStateToVoiceState(internalState);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center select-none w-full max-w-xl aspect-square",
        className
      )}
      role="img"
      aria-label={`ELMO Floating AI Core in state ${internalState}`}
    >
      <ElmoCore
        voiceState={voiceState}
        size="full"
        interactive={interactive}
        enableWorkforceSockets={true}
        onStateChange={(s) => {
          setInternalState(s as ELMORobotState);
          onStateChange?.(s as ELMORobotState);
        }}
      />
    </div>
  );
}
