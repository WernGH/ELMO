"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { VoiceService } from "@/services/voice.service";
import {
  DEFAULT_VOICE_SETTINGS,
  WakeWordService,
} from "@/services/wake-word.service";
import {
  VoiceConfig,
  VoiceError,
  VoiceMode,
  VoiceSettings,
  VoiceState,
  WakeWordMatch,
  WakeWordStatus,
} from "@/types/voice.types";

export interface UseVoiceOptions {
  initialMode?: VoiceMode;
  config?: Partial<VoiceConfig>;
  onSpeechComplete?: (finalTranscript: string) => void;
  onWakeWordOnly?: () => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { initialMode = "text", config, onSpeechComplete, onWakeWordOnly } = options;

  const [mode, setMode] = useState<VoiceMode>(initialMode);
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [isFinal, setIsFinal] = useState<boolean>(false);
  const [error, setError] = useState<VoiceError | null>(null);

  const [isSTTSupported, setIsSTTSupported] = useState<boolean>(false);
  const [isTTSSupported, setIsTTSSupported] = useState<boolean>(false);

  // Wake Word & Hands-Free States
  const [wakeWordStatus, setWakeWordStatus] = useState<WakeWordStatus>("disabled");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [isInConversationWindow, setIsInConversationWindow] = useState<boolean>(false);
  const [conversationTimerSeconds, setConversationTimerSeconds] = useState<number>(0);

  const onSpeechCompleteRef = useRef(onSpeechComplete);
  onSpeechCompleteRef.current = onSpeechComplete;

  const onWakeWordOnlyRef = useRef(onWakeWordOnly);
  onWakeWordOnlyRef.current = onWakeWordOnly;

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const wakeWordServiceRef = useRef<WakeWordService | null>(null);

  useEffect(() => {
    const vs = VoiceService.getInstance();
    const ww = WakeWordService.getInstance();

    voiceServiceRef.current = vs;
    wakeWordServiceRef.current = ww;

    if (config) {
      vs.updateConfig(config);
    }

    setIsSTTSupported(vs.isSTTSupported());
    setIsTTSSupported(vs.isTTSSupported());
    setState(vs.getState());

    // 1. Subscribe to VoiceService state changes
    const unsubState = vs.subscribeState((newState) => {
      setState(newState);

      // If state became listening, speaking, or processing, pause ambient wake-word recognition
      if (newState === "listening" || newState === "speaking" || newState === "processing") {
        ww.pauseListening();
      } else if (newState === "idle") {
        // Return to ambient wake-word listening if enabled and in voice mode
        if (ww.getSettings().wakeWordDetection) {
          ww.startListening();
        }
      }
    });

    // 2. Subscribe to transcripts
    const unsubTranscript = vs.subscribeTranscript((text, final) => {
      setTranscript(text);
      setIsFinal(final);

      // If recognition finalized a message, trigger callback
      if (final && text.trim().length > 0) {
        if (onSpeechCompleteRef.current) {
          onSpeechCompleteRef.current(text.trim());
        }
      }
    });

    // 3. Subscribe to errors
    const unsubError = vs.subscribeError((err) => {
      setError(err);
    });

    // 4. Subscribe to WakeWordService status & settings
    const unsubWWStatus = ww.subscribeStatus((status) => {
      setWakeWordStatus(status);
    });

    const unsubWWSettings = ww.subscribeSettings((settings) => {
      setVoiceSettings(settings);
    });

    const unsubWWWindow = ww.subscribeConversationWindow((inWindow, sec) => {
      setIsInConversationWindow(inWindow);
      setConversationTimerSeconds(sec);
    });

    // 5. Handle wake word detections
    const unsubWWMatch = ww.subscribeWakeWord((match: WakeWordMatch) => {
      if (match.isWakeOnly) {
        // User said only "Hey ELMO"
        if (onWakeWordOnlyRef.current) {
          onWakeWordOnlyRef.current();
        } else {
          // Default behavior: acknowledge and listen
          vs.speak("Yes, I'm listening.").then(() => {
            vs.startListening();
          });
        }
      } else if (match.cleanedPrompt) {
        // User said "Hey ELMO, [directive]" in one phrase
        if (onSpeechCompleteRef.current) {
          onSpeechCompleteRef.current(match.cleanedPrompt);
        }
      }
    });

    // Start ambient wake word if enabled
    if (ww.getSettings().wakeWordDetection && vs.isSTTSupported()) {
      ww.startListening();
    }

    return () => {
      unsubState();
      unsubTranscript();
      unsubError();
      unsubWWStatus();
      unsubWWSettings();
      unsubWWWindow();
      unsubWWMatch();
      vs.stopSpeaking();
      vs.abortListening();
      ww.stopListening();
    };
  }, [config]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setIsFinal(false);
    if (voiceServiceRef.current) {
      // Pause ambient recognizer while active recognition runs
      wakeWordServiceRef.current?.pauseListening();
      // Socket detachment cooldown: give browser audio stack 80ms to close ambient socket
      await new Promise((resolve) => setTimeout(resolve, 80));
      await voiceServiceRef.current.startListening();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopListening();
    }
  }, []);

  const abortListening = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.abortListening();
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopSpeaking();
    }
    // Return to wake-word standby
    if (wakeWordServiceRef.current?.getSettings().wakeWordDetection) {
      wakeWordServiceRef.current.startListening();
    }
  }, []);

  const speak = useCallback(
    async (text: string, overrideConfig?: Partial<VoiceConfig>) => {
      if (voiceServiceRef.current) {
        await voiceServiceRef.current.speak(text, overrideConfig);
      }
    },
    []
  );

  const waitUntilSpoken = useCallback(async () => {
    if (voiceServiceRef.current) {
      await voiceServiceRef.current.waitUntilSpoken();
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setState("idle");
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const nextMode = prev === "voice" ? "text" : "voice";
      if (nextMode === "text") {
        voiceServiceRef.current?.stopSpeaking();
        voiceServiceRef.current?.abortListening();
        wakeWordServiceRef.current?.pauseListening();
      } else {
        if (wakeWordServiceRef.current?.getSettings().wakeWordDetection) {
          wakeWordServiceRef.current.startListening();
        }
      }
      return nextMode;
    });
  }, []);

  const updateVoiceSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    wakeWordServiceRef.current?.updateSettings(newSettings);
  }, []);

  const startConversationWindow = useCallback((seconds?: number) => {
    wakeWordServiceRef.current?.startConversationWindow(seconds);
  }, []);

  const isMicrophoneActive =
    state === "listening" || (wakeWordStatus === "active" && mode === "voice");

  return {
    state,
    mode,
    setMode,
    toggleMode,
    transcript,
    isFinal,
    error,
    clearError,
    isSTTSupported,
    isTTSSupported,
    startListening,
    stopListening,
    abortListening,
    stopSpeaking,
    speak,
    waitUntilSpoken,
    // Wake Word & Hands-Free
    wakeWordStatus,
    voiceSettings,
    updateVoiceSettings,
    isInConversationWindow,
    conversationTimerSeconds,
    startConversationWindow,
    isMicrophoneActive,
  };
}
