"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Radio,
  Zap,
  Volume2,
  VolumeX,
  X,
  Menu,
  MessageSquare,
  Sparkles,
  Activity,
  Sliders,
  Send,
  Bot,
  User,
  Shield,
  Clock,
  ArrowRight,
  Target,
  CheckSquare,
  Users,
} from "lucide-react";
import { VoiceState, MicPermissionState, LanguageContext } from "@/services/voice/voice.types";
import { VoiceController } from "@/services/voice/voice-controller";
import { AudioManager } from "@/services/voice/audio-manager";
import { LanguageContextService } from "@/services/voice/language-context.service";
import { ChatService } from "@/services/chat.service";
import { GeminiService } from "@/services/gemini.service";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { ElmoCore } from "@/components/elmo";
import { VoiceWaveform } from "@/components/voice/VoiceWaveform";
import { VoiceControlsPanel } from "@/components/voice/VoiceControlsPanel";
import { ELMOTranscript } from "@/components/voice/ELMOTranscript";
import { ELMOVoiceControls } from "@/components/voice/ELMOVoiceControls";
import { ConversationMessage } from "@/components/voice/LiveConversationPanel";
import { VoiceLanguageSelector } from "@/components/voice/VoiceLanguageSelector";
import { VoiceDebugPanel } from "@/components/voice/VoiceDebugPanel";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FullScreenSpeakModeProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessages?: ConversationMessage[];
  organizationId?: string;
  userId?: string;
}

export function FullScreenSpeakMode({
  isOpen,
  onClose,
  initialMessages = [],
  organizationId = "11111111-1111-1111-1111-111111111111",
  userId = "00000000-0000-0000-0000-000000000001",
}: FullScreenSpeakModeProps) {
  // Voice State & Lifecycle
  const [voiceState, setVoiceState] = useState<VoiceState>("STANDBY");
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unrequested");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [langContext, setLangContext] = useState<LanguageContext>({
    detectedLanguage: "en",
    confidence: 1.0,
    previousLanguage: "en",
    responseLanguage: "en",
    languageChanged: false,
    mixedLanguage: false,
  });
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const lastElmoResponse = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
  const [currentTime, setCurrentTime] = useState("");

  // Floating Drawer States
  const [activePanel, setActivePanel] = useState<"conversation" | "controls" | "insights" | "activity" | null>("conversation");
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [textInput, setTextInput] = useState("");

  const controllerRef = useRef<VoiceController | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const chatService = ChatService.getInstance();
  const geminiService = GeminiService.getInstance();

  // 1. Live Clock Telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace("T", " • ").slice(0, 19) + " UTC");
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Initialize Voice Engine & Auto-Start when opened
  useEffect(() => {
    if (!isOpen) return;

    let unsubPermission: (() => void) | null = null;
    let unsubState: (() => void) | null = null;
    let unsubAudioLevel: (() => void) | null = null;
    let unsubLang: (() => void) | null = null;

    async function startEngine() {
      const controller = VoiceController.getInstance({
        organizationId,
        userId,
        onTranscriptUpdate: (text) => {
          setLiveTranscript(text);
        },
        onMessageCreated: (role, content) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role,
              content,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        },
      });
      // Force update callbacks to guarantee modal binding
      controller.updateCallbacks({
        organizationId,
        userId,
        onTranscriptUpdate: (text) => {
          setLiveTranscript(text);
        },
        onMessageCreated: (role, content) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role,
              content,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        },
      });
      controllerRef.current = controller;

      const audioMgr = controller.getAudioManager();
      audioManagerRef.current = audioMgr;
      setMicPermission(audioMgr.getPermissionState());

      unsubPermission = audioMgr.subscribePermission((perm) => {
        setMicPermission(perm);
      });

      unsubAudioLevel = audioMgr.subscribeAudioLevel((level) => {
        setAudioLevel(level);
      });

      unsubLang = controller.getLanguageContextService().subscribe((ctx) => {
        setLangContext(ctx);
      });

      const stateMgr = controller.getStateManager();
      unsubState = stateMgr.subscribe((st) => {
        setVoiceState(st);
        setIsVoiceActive(st !== "STANDBY" && st !== "ERROR");
        if (st === "STANDBY") {
          setIsPaused(false);
        }
      });

      // Automatically request mic and start continuous natural loop
      const started = await controller.startVoiceMode();
      setIsVoiceActive(started);
    }

    startEngine();

    return () => {
      if (unsubPermission) unsubPermission();
      if (unsubState) unsubState();
      if (unsubAudioLevel) unsubAudioLevel();
      if (unsubLang) unsubLang();
      if (controllerRef.current) {
        controllerRef.current.stopVoiceMode();
      }
    };
  }, [isOpen, organizationId, userId]);

  // 3. Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript, activePanel]);

  // 4. Keyboard Shortcuts: ESC to exit, Space/M for mic, I for interrupt
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleExit();
      } else if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleInterrupt();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, voiceState]);

  // Clean Exit
  const handleExit = () => {
    if (controllerRef.current) {
      controllerRef.current.stopVoiceMode();
    }
    setIsVoiceActive(false);
    setIsPaused(false);
    setLiveTranscript("");
    onClose();
  };

  const handleInterrupt = () => {
    if (!controllerRef.current) return;
    controllerRef.current.interrupt();
    setVoiceState("INTERRUPTED");
    setTimeout(() => {
      setVoiceState("LISTENING");
    }, 400);
  };

  const handleToggleVoiceMode = async () => {
    if (!controllerRef.current) return;
    if (isVoiceActive && voiceState !== "STANDBY") {
      controllerRef.current.stopVoiceMode();
      setIsVoiceActive(false);
      setIsPaused(false);
      setLiveTranscript("");
    } else {
      const started = await controllerRef.current.startVoiceMode();
      setIsVoiceActive(started);
      setIsPaused(false);
    }
  };

  const handlePauseVoiceMode = () => {
    if (!controllerRef.current) return;
    controllerRef.current.pauseVoiceMode();
    setIsPaused(true);
  };

  const handleResumeVoiceMode = async () => {
    if (!controllerRef.current) return;
    const resumed = await controllerRef.current.resumeVoiceMode();
    if (resumed) {
      setIsPaused(false);
    }
  };

  const handleToggleManualMic = async () => {
    if (!controllerRef.current) return;
    await controllerRef.current.toggleManualMicrophone();
  };

  const handleForceSend = async () => {
    if (!controllerRef.current || !liveTranscript.trim()) return;
    const textToSend = liveTranscript.trim();
    setLiveTranscript("");
    await controllerRef.current.handleUserUtteranceComplete(textToSend);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput("");
    setVoiceState("PROCESSING");

    try {
      const elmo = ELMOIntelligenceService.getInstance();
      const currentConvId = controllerRef.current?.getConversationId() || undefined;
      const response = await elmo.processMessage({
        userId,
        organizationId,
        conversationId: currentConvId,
        message: text,
        inputMode: "text",
      });

      if (response.conversationId && controllerRef.current) {
        controllerRef.current.updateContext(organizationId, userId, response.conversationId);
      }

      const assistantMsg: ConversationMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If voice is active and unpaused, speak aloud automatically
      if (isVoiceActive && !isPaused && controllerRef.current) {
        setVoiceState("ELMO_SPEAKING");
        await controllerRef.current.getTTS().speak(response.text);
        setVoiceState("LISTENING");
      } else {
        setVoiceState("STANDBY");
      }
    } catch {
      setVoiceState("ERROR");
    }
  };

  if (!isOpen) return null;

  const isSpeaking = voiceState === "ELMO_SPEAKING";
  const isListening = voiceState === "LISTENING";
  const isUserSpeaking = voiceState === "USER_SPEAKING";
  const isProcessing = voiceState === "PROCESSING";
  const isInterrupted = voiceState === "INTERRUPTED";

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#03060C] text-white select-none flex flex-col font-sans animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="ELMO Full-Screen Natural Voice AI Command Center"
    >
      {/* ========================================================= */}
      {/* 1. DEEP BLACK & NAVY ATMOSPHERIC ENVIRONMENT              */}
      {/* ========================================================= */}
      {/* Tech Grid Background */}
      <div className="absolute inset-0 tech-grid opacity-35 pointer-events-none" />

      {/* Radial Blue Ambient Lighting behind ELMO */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full blur-[140px] pointer-events-none transition-colors duration-1000",
          isSpeaking
            ? "bg-blue-600/20"
            : isUserSpeaking || isListening
            ? "bg-cyan-500/18"
            : isProcessing
            ? "bg-cyan-400/22"
            : "bg-blue-900/12"
        )}
      />

      {/* Cyber Corner Brackets on Screen Edges */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

      {/* ========================================================= */}
      {/* 2. MINIMAL TOP BAR: STATUS, TELEMETRY & CONTROLS          */}
      {/* ========================================================= */}
      <header className="relative z-30 h-16 px-6 flex items-center justify-between border-b border-[#112038]/80 bg-[#030712]/75 backdrop-blur-md shrink-0">
        {/* Left: Menu Drawer Trigger & Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#071120] border border-[#162744] hover:border-cyan-400/50 transition-colors text-xs font-mono text-zinc-300 hover:text-white group"
            title="Platform Navigation Drawer"
          >
            <Menu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">MENU</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="text-sm font-black tracking-wider text-white font-sans">
              ELMO
            </span>
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              COMMAND CENTER
            </span>
          </div>
        </div>

        {/* Center: System Status & Telemetry Indicators */}
        <div className="hidden md:flex items-center gap-3 font-mono text-xs">
          {/* Main Status */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm transition-colors",
              voiceState === "RECONNECTING"
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                : voiceState === "ERROR"
                ? "bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                : "bg-cyan-950/40 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.25)]"
            )}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  voiceState === "RECONNECTING"
                    ? "bg-amber-400"
                    : voiceState === "ERROR"
                    ? "bg-rose-400"
                    : "bg-cyan-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  voiceState === "RECONNECTING"
                    ? "bg-amber-400 shadow-[0_0_8px_#F59E0B]"
                    : voiceState === "ERROR"
                    ? "bg-rose-400 shadow-[0_0_8px_#F43F5E]"
                    : "bg-cyan-400 shadow-[0_0_8px_#00D2FF]"
                )}
              />
            </span>
            <span className="font-bold tracking-wider">
              {voiceState === "RECONNECTING"
                ? "RECONNECTING..."
                : voiceState === "ERROR"
                ? "SYSTEM ALERT"
                : "ELMO ONLINE"}
            </span>
          </div>

          {/* Multilingual Interactive Voice Selector & Brain Telemetry */}
          <VoiceLanguageSelector
            controller={controllerRef.current}
            currentLanguage={langContext.responseLanguage}
            onLanguageChange={(code) => {
              setLangContext((prev) => ({
                ...prev,
                responseLanguage: code,
                detectedLanguage: code,
              }));
            }}
            size="sm"
          />

          <VoiceDebugPanel />

          {/* Floating Subtle Telemetry Indicators */}
          <span className="text-[10px] text-zinc-400 border border-[#162744] bg-[#071120] px-2 py-0.5 rounded-full">
            MIC: <strong className="text-cyan-400">{micPermission === "granted" ? "ACTIVE" : micPermission}</strong>
          </span>
          <span className="text-[10px] text-zinc-400 border border-[#162744] bg-[#071120] px-2 py-0.5 rounded-full">
            MODE: <strong className="text-cyan-400">REALTIME</strong>
          </span>
          {currentTime && (
            <span className="text-[10px] text-zinc-500 hidden lg:inline">
              {currentTime}
            </span>
          )}
        </div>

        {/* Right: Exit Voice Mode Button */}
        <div className="flex items-center gap-3">
          {isSpeaking && (
            <button
              onClick={handleInterrupt}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyan-400 text-black hover:bg-cyan-300 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.6)] animate-pulse"
              title="Interrupt ELMO (Barge-in)"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>INTERRUPT</span>
            </button>
          )}

          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#091120] border border-[#1E3354] hover:border-rose-500/60 hover:text-rose-300 text-xs font-mono text-zinc-300 transition-colors shadow-sm"
            title="Exit Full-Screen Speak Mode (Esc)"
          >
            <span>EXIT VOICE MODE</span>
            <span className="text-[10px] text-zinc-500 hidden sm:inline">[ESC]</span>
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3. CENTER STAGE: FLOATING AI CORE                        */}
      {/* ========================================================= */}
      <main className="relative flex-1 flex flex-col items-center justify-between p-4 overflow-hidden">

        {/* Top Space / State Guidance Ribbon */}
        <div className="relative z-10 pt-2 sm:pt-4 text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#061022]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,210,255,0.25)] backdrop-blur-md">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isInterrupted
                  ? "bg-white animate-ping shadow-[0_0_10px_#FFFFFF]"
                  : isSpeaking
                  ? "bg-cyan-300 animate-pulse shadow-[0_0_10px_#00F0FF]"
                  : isUserSpeaking
                  ? "bg-blue-400 animate-pulse shadow-[0_0_10px_#0084FF]"
                  : isProcessing
                  ? "bg-cyan-400 animate-spin shadow-[0_0_10px_#00E5FF]"
                  : "bg-cyan-400"
              )}
            />
            <span className="text-xs font-mono font-bold tracking-widest text-white uppercase">
              {voiceState === "LISTENING" && `LISTENING · ${LanguageContextService.getLanguageLabel(langContext.responseLanguage)}`}
              {voiceState === "USER_SPEAKING" && `USER SPEAKING · ${LanguageContextService.getLanguageLabel(langContext.detectedLanguage)}`}
              {voiceState === "PROCESSING" && `PROCESSING · ${LanguageContextService.getLanguageLabel(langContext.responseLanguage)}`}
              {voiceState === "ELMO_SPEAKING" && `SPEAKING · ${LanguageContextService.getLanguageLabel(langContext.responseLanguage)}`}
              {voiceState === "INTERRUPTED" && "⚡ INTERRUPTED"}
              {voiceState === "STANDBY" && "VOICE ENGINE STANDBY"}
              {voiceState === "ERROR" && "VOICE ENGINE ALERT"}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-cyan-200/80 font-sans tracking-wide">
            {voiceState === "LISTENING" && "“I’m listening...” Speak naturally without wake words"}
            {voiceState === "USER_SPEAKING" && "Capturing your speech stream..."}
            {voiceState === "PROCESSING" && "Synthesizing executive response via Gemini..."}
            {voiceState === "ELMO_SPEAKING" && "Delivering audio briefing — speak anytime to interrupt"}
            {voiceState === "INTERRUPTED" && "Barge-in signal detected — listening to new directive"}
            {voiceState === "STANDBY" && "Voice loop paused — tap Start Voice below"}
            {voiceState === "ERROR" && "Microphone or network error — text fallback active"}
          </p>
        </div>

        {/* Center: Large Floating AI Core (Primary Visual Focus) */}
        <div className="relative z-10 flex-1 flex items-center justify-center w-full max-h-[68vh] py-4">
          <ElmoCore
            voiceState={voiceState}
            audioLevel={audioLevel}
            size="full"
            interactive={true}
            enableWorkforceSockets={true}
            onStateChange={(s) => setVoiceState(s as VoiceState)}
          />
        </div>

        {/* Bottom: Dynamic Real-Time Voice Waveform, Transcript & Controls */}
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center pb-2 sm:pb-4 space-y-2.5">
          {(!isVoiceActive || voiceState === "STANDBY") && (
            <button
              onClick={handleToggleVoiceMode}
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-sm shadow-[0_0_30px_rgba(0,210,255,0.7)] animate-pulse transition-all cursor-pointer z-20"
              title="Activate Microphone and Start Continuous Voice Loop"
            >
              <Mic className="w-5 h-5 text-black" />
              <span>START VOICE (CLICK TO TALK)</span>
            </button>
          )}

          {micPermission === "denied" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs font-mono">
              <Shield className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Microphone blocked in browser. Click the lock/tune icon in your address bar to enable mic.</span>
            </div>
          )}

          <VoiceWaveform
            voiceState={voiceState}
            audioManager={audioManagerRef.current || undefined}
          />

          <ELMOTranscript
            voiceState={voiceState}
            liveTranscript={liveTranscript}
            lastElmoResponse={lastElmoResponse}
          />

          {liveTranscript.trim().length > 0 && voiceState !== "PROCESSING" && voiceState !== "ELMO_SPEAKING" && (
            <button
              onClick={handleForceSend}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.6)] animate-pulse transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>TRANSMIT DIRECTIVE NOW</span>
            </button>
          )}

          <ELMOVoiceControls
            voiceState={voiceState}
            isVoiceActive={isVoiceActive}
            isPaused={isPaused}
            onToggleVoiceMode={handleToggleVoiceMode}
            onPauseVoiceMode={handlePauseVoiceMode}
            onResumeVoiceMode={handleResumeVoiceMode}
            onToggleManualMic={handleToggleManualMic}
            onStopSpeaking={handleInterrupt}
            onExitSpeakMode={handleExit}
          />

          {/* Quick Voice State Preview Pills for Testing & Demo */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#060D1A]/80 border border-[#14233D] backdrop-blur-md">
            {(
              [
                "STANDBY",
                "LISTENING",
                "USER_SPEAKING",
                "PROCESSING",
                "ELMO_SPEAKING",
                "INTERRUPTED",
              ] as VoiceState[]
            ).map((st) => (
              <button
                key={st}
                onClick={() => setVoiceState(st)}
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-colors",
                  voiceState === st
                    ? "bg-cyan-400 text-black font-bold shadow-[0_0_8px_#00E5FF]"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title={`Preview state: ${st}`}
              >
                {st.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================= */}
        {/* 4. FLOATING HOLOGRAPHIC PANELS (RIGHT SIDE)             */}
        {/* ======================================================= */}
        {/* Floating Quick Action Drawer Toggles */}
        <div className="absolute right-4 top-20 z-40 flex flex-col gap-2">
          <button
            onClick={() => setActivePanel(activePanel === "conversation" ? null : "conversation")}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all shadow-lg backdrop-blur-md",
              activePanel === "conversation"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
                : "bg-[#060D1A]/80 border-[#14233D] text-zinc-400 hover:text-zinc-200"
            )}
            title="Toggle Live Conversation Panel"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CONVERSATION</span>
          </button>

          <button
            onClick={() => setActivePanel(activePanel === "controls" ? null : "controls")}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all shadow-lg backdrop-blur-md",
              activePanel === "controls"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
                : "bg-[#060D1A]/80 border-[#14233D] text-zinc-400 hover:text-zinc-200"
            )}
            title="Toggle Voice Controls Panel"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CONTROLS</span>
          </button>

          <button
            onClick={() => setActivePanel(activePanel === "insights" ? null : "insights")}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all shadow-lg backdrop-blur-md",
              activePanel === "insights"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
                : "bg-[#060D1A]/80 border-[#14233D] text-zinc-400 hover:text-zinc-200"
            )}
            title="Toggle ELMO Strategic Insights"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">INSIGHTS</span>
          </button>
        </div>

        {/* Floating LIVE CONVERSATION Panel */}
        {activePanel === "conversation" && (
          <div className="absolute right-4 top-36 bottom-20 z-40 w-full max-w-sm sm:max-w-md flex flex-col rounded-2xl bg-[#060D1A]/95 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in slide-in-from-right-4 duration-200">
            {/* Panel Header */}
            <div className="p-3.5 border-b border-[#14233D] bg-[#050A14]/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  LIVE CONVERSATION
                </h3>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#121E33]">
              {messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[90%] space-y-1",
                      isAssistant ? "mr-auto items-start" : "ml-auto items-end"
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                      {isAssistant ? (
                        <>
                          <Bot className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-400 font-bold">ELMO</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-blue-400" />
                          <span className="text-blue-300 font-bold">OPERATOR</span>
                        </>
                      )}
                    </div>
                    <div
                      className={cn(
                        "p-3 rounded-xl text-xs font-sans leading-relaxed",
                        isAssistant
                          ? "bg-[#091428] border border-cyan-500/30 text-zinc-100 rounded-tl-none shadow-[0_0_12px_rgba(0,210,255,0.1)]"
                          : "bg-gradient-to-r from-blue-900/60 to-cyan-900/40 border border-blue-400/40 text-white rounded-tr-none"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {/* Interim Live Transcript */}
              {liveTranscript && (
                <div className="flex flex-col max-w-[90%] ml-auto items-end space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
                    <User className="w-3 h-3 animate-pulse" />
                    <span>OPERATOR // SPEAKING...</span>
                  </div>
                  <div className="p-3 rounded-xl text-xs font-sans bg-[#0A1830] border border-cyan-400/60 text-cyan-200 rounded-tr-none shadow-[0_0_15px_rgba(0,210,255,0.25)]">
                    &ldquo;{liveTranscript}&rdquo;
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Fallback Text Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(textInput);
              }}
              className="p-3 border-t border-[#14233D] bg-[#050A14] flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a directive for ELMO..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#091120] border border-[#162744] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 font-sans"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-black font-bold text-xs hover:brightness-110 transition-all disabled:opacity-30 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Voice Controls Panel */}
        {activePanel === "controls" && (
          <div className="absolute right-4 top-36 z-40 w-full max-w-sm rounded-2xl bg-[#060D1A]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl p-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#14233D]">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                VOICE TELEMETRY
              </h3>
              <button onClick={() => setActivePanel(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <VoiceControlsPanel
              voiceState={voiceState}
              isVoiceActive={isVoiceActive}
              isPaused={isPaused}
              micPermission={micPermission}
              onToggleVoiceMode={handleToggleVoiceMode}
              onPauseVoiceMode={handlePauseVoiceMode}
              onResumeVoiceMode={handleResumeVoiceMode}
              onToggleManualMic={handleToggleManualMic}
              onStopSpeaking={handleInterrupt}
              className="p-0 border-0 shadow-none bg-transparent mt-3"
            />
          </div>
        )}

        {/* Floating ELMO Insights Card */}
        {activePanel === "insights" && (
          <div className="absolute right-4 top-36 z-40 w-full max-w-sm rounded-2xl bg-[#060D1A]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl p-5 animate-in slide-in-from-right-4 duration-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#14233D]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  ELMO STRATEGIC INSIGHT
                </h3>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-white leading-relaxed">
              Prime opportunity detected in your current lead pipeline.
            </p>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
              VECTOR-4 identified 8 uncontacted enterprise leads matching our highest-converting customer profile. Initiating outreach today could accelerate monthly goal velocity by 24%.
            </p>

            <button
              onClick={() => {
                handleSendMessage("ELMO, tell me more about the prime opportunity detected in our pipeline.");
                setActivePanel("conversation");
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-mono font-bold text-xs hover:brightness-110 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.3)]"
            >
              <span>Ask ELMO to Elaborate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 5. SLIDING PLATFORM NAVIGATION OVERLAY DRAWER             */}
      {/* ========================================================= */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsNavDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer Chassis */}
          <div className="relative w-72 h-full bg-[#050A14] border-r border-cyan-500/30 p-6 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#14233D]">
                <div>
                  <h3 className="text-sm font-bold text-white">ELMO PLATFORM</h3>
                  <p className="text-[10px] font-mono text-cyan-400">COMMAND MATRIX NAVIGATION</p>
                </div>
                <button
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {NAVIGATION_ITEMS.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      setIsNavDrawerOpen(false);
                      handleExit();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-cyan-300 hover:bg-[#0C172B] transition-colors"
                  >
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {item.name === "ELMO" ? "CORE AI" : item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#14233D] text-[10px] font-mono text-zinc-500">
              <span>ELMO NATURAL VOICE // FULL SCREEN</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
