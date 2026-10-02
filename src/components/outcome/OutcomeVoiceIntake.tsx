"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Sparkles, Send, Volume2, AlertCircle } from "lucide-react";

interface OutcomeVoiceIntakeProps {
  onCommitOutcome: (prompt: string) => void;
  className?: string;
  placeholder?: string;
}

export function OutcomeVoiceIntake({
  onCommitOutcome,
  className = "",
  placeholder = "e.g., Increase my qualified leads by 30% over the next 30 days",
}: OutcomeVoiceIntakeProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
      } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
        };

        recognition.onerror = (event: any) => {
          console.warn("[VoiceIntake] Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please type your outcome directly.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("[VoiceIntake] Start error:", err);
      }
    }
  };

  const speakElmoResponse = (text: string) => {
    if (!audioFeedbackEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.95; // Authoritative executive tone
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = transcript.trim();
    if (!clean) return;

    // Speak executive confirmation
    speakElmoResponse("Outcome received. Analyzing requirements, evaluating readiness, and deploying the robot workforce.");

    onCommitOutcome(clean);
    setTranscript("");
  };

  return (
    <div className={`p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00FF66]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Outcome Intake • Direct Voice or Text to ELMO
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
            className={`p-1.5 rounded-lg border text-[11px] transition-colors ${
              audioFeedbackEnabled
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-zinc-900 text-zinc-500 border-zinc-800"
            }`}
            title={audioFeedbackEnabled ? "ELMO voice feedback ON" : "ELMO voice feedback MUTED"}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
        <div className="relative flex-1">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isListening ? "Listening to your outcome request..." : placeholder}
            className={`w-full px-4 py-3 rounded-xl bg-zinc-900 border text-xs text-white placeholder-zinc-500 focus:outline-none transition-all ${
              isListening
                ? "border-rose-500/70 ring-2 ring-rose-500/30 bg-rose-950/20"
                : "border-zinc-800 focus:border-[#00FF66]/60 focus:ring-1 focus:ring-[#00FF66]/30"
            }`}
          />

          {isListening && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          )}
        </div>

        {/* Voice Trigger Microphone */}
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center ${
            isListening
              ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.4)] animate-pulse"
              : isSupported
              ? "bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white hover:border-[#00FF66]/60"
              : "bg-zinc-900/50 text-zinc-600 border-zinc-800 cursor-not-allowed"
          }`}
          title={isListening ? "Click to stop listening" : "Click to speak outcome to ELMO"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Submit Execution Button */}
        <button
          type="submit"
          disabled={!transcript.trim()}
          className="px-4 py-3 rounded-xl bg-[#00FF66] hover:bg-[#00FF66]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs shadow-[0_0_14px_rgba(0,255,102,0.3)] transition-all flex items-center gap-1.5"
        >
          <span>Launch Outcome</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {isListening && (
        <p className="text-[11px] text-rose-300 mt-2 flex items-center gap-1.5 animate-pulse">
          <span>🎙️</span>
          <span>ELMO is listening. State your target business outcome clearly.</span>
        </p>
      )}
    </div>
  );
}
