"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Bot,
  Building,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Shield,
  ShieldCheck,
  Users,
  Target,
  CheckSquare,
  Search,
  Megaphone,
  PenTool,
  Flame,
  Headphones,
  Calendar,
  Code2,
  Sparkles,
  X,
  Mic,
  MicOff,
  Radio,
  Clock,
  AlertTriangle,
  Zap,
  Pause,
  Play,
} from "lucide-react";
import { AuthService } from "@/services/auth.service";
import { OrganizationService } from "@/services/organization.service";
import { ChatService } from "@/services/chat.service";
import { GeminiService } from "@/services/gemini.service";
import { RLSAuditService, SecurityAuditResult } from "@/services/rls-audit.service";
import { OrganizationWithMemberRole } from "@/types/organization.types";
import { UserSession } from "@/types/auth.types";
import { ELMO_IDENTITY } from "@/lib/constants";
import { ElmoCore, CORE_STATE_METADATA } from "@/components/elmo";
import { AudioVisualizer } from "@/components/voice/AudioVisualizer";
import { LiveConversationPanel, ConversationMessage } from "@/components/voice/LiveConversationPanel";
import { BottomOverviewArea } from "@/components/dashboard/BottomOverviewArea";
import { EmployeeCard, AIEmployee } from "@/components/dashboard/EmployeeCard";
import { DigitalBadge } from "@/components/ui/DigitalBadge";
import { FullScreenSpeakMode } from "@/components/voice/FullScreenSpeakMode";
import { VoiceLanguageSelector } from "@/components/voice/VoiceLanguageSelector";
import { VoiceDebugPanel } from "@/components/voice/VoiceDebugPanel";
import { VoiceController } from "@/services/voice/voice-controller";
import { AudioManager } from "@/services/voice/audio-manager";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { MicPermissionState, VoiceError, VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

// 7 Specialist AI Workforce Roles (Standby Preview)
const WORKFORCE_EMPLOYEES: AIEmployee[] = [
  {
    id: "emp-1",
    role: "Research Employee",
    codename: "AURA-1",
    category: "Intelligence",
    status: "STANDBY",
    icon: Search,
    capabilities: ["Competitor Benchmarking", "Market Mining", "ICP Intel"],
  },
  {
    id: "emp-2",
    role: "Marketing Employee",
    codename: "NEXUS-2",
    category: "Growth",
    status: "STANDBY",
    icon: Megaphone,
    capabilities: ["Multi-channel Ads", "Meta & Google Ads", "Growth Funnels"],
  },
  {
    id: "emp-3",
    role: "Content Employee",
    codename: "SCRIBE-3",
    category: "Production",
    status: "STANDBY",
    icon: PenTool,
    capabilities: ["SEO Long-form", "Ad Copywriting", "Visual Assets"],
  },
  {
    id: "emp-4",
    role: "Sales Employee",
    codename: "VECTOR-4",
    category: "Revenue",
    status: "STANDBY",
    icon: Flame,
    capabilities: ["Outbound Lead Sourcing", "CRM Scoring", "Direct Pitching"],
  },
  {
    id: "emp-5",
    role: "Customer Service Employee",
    codename: "ECHO-5",
    category: "Retention",
    status: "STANDBY",
    icon: Headphones,
    capabilities: ["24/7 Omnichannel Support", "Ticket Auto-Triage", "CSAT Tracking"],
  },
  {
    id: "emp-6",
    role: "Admin Employee",
    codename: "CHRONOS-6",
    category: "Operations",
    status: "STANDBY",
    icon: Calendar,
    capabilities: ["Calendar & Meeting Exec", "Invoice Audit", "Process Verification"],
  },
  {
    id: "emp-7",
    role: "Developer Employee",
    codename: "SYNTAX-7",
    category: "Engineering",
    status: "STANDBY",
    icon: Code2,
    capabilities: ["API Integrations", "Workflow Automation", "Webhook Monitoring"],
  },
];

const INITIAL_MESSAGES: ConversationMessage[] = [
  {
    id: "init-1",
    role: "assistant",
    content:
      "All systems online. I am ready to coordinate company operations, track your pipeline, and orchestrate our workforce.",
    timestamp: "Online",
  },
];

export default function OverviewPage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [organization, setOrganization] = useState<OrganizationWithMemberRole | null>(null);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Live Voice State & Controller
  const [elmoVoiceState, setElmoVoiceState] = useState<VoiceState>("STANDBY");
  const [voiceError, setVoiceError] = useState<VoiceError | null>(null);
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unrequested");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [currentVoiceLanguage, setCurrentVoiceLanguage] = useState<string>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("elmo_voice_language");
      if (saved) return saved.split("-")[0];
    }
    return "en";
  });

  // Live Conversation Messages
  const [messages, setMessages] = useState<ConversationMessage[]>(INITIAL_MESSAGES);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<AIEmployee | null>(null);
  const [activeTab, setActiveTab] = useState<"command" | "security">("command");
  const [isFullScreenSpeakOpen, setIsFullScreenSpeakOpen] = useState(false);

  const controllerRef = useRef<VoiceController | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);

  const authService = AuthService.getInstance();
  const orgService = OrganizationService.getInstance();
  const chatService = ChatService.getInstance();
  const geminiService = GeminiService.getInstance();

  useEffect(() => {
    async function init() {
      const sess = await authService.getSession();
      setSession(sess);

      const orgId = sess.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const userId = sess.user?.id || "00000000-0000-0000-0000-000000000001";

      if (sess.user && sess.activeOrganizationId) {
        const { data: org } = await orgService.getOrganization(userId, orgId);
        setOrganization(org);
      }

      // Load recent messages from Supabase/ChatService if available
      let convId: string | null = null;
      try {
        const { data: convs } = await chatService.listConversations(userId, orgId);
        if (convs && convs.length > 0) {
          convId = convs[0].id;
          setActiveConversationId(convId);
          const { data: pastMsgs } = await chatService.listMessages(userId, orgId, convId);
          if (pastMsgs && pastMsgs.length > 0) {
            setMessages(
              pastMsgs.slice(-10).map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                created_at: m.created_at,
              }))
            );
          }
        }
      } catch (e) {
        // Fallback to initial messages
      }

      // Initialize Voice Controller
      const controller = VoiceController.getInstance({
        organizationId: orgId,
        userId,
        conversationId: convId || undefined,
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

      const unsubPermission = audioMgr.subscribePermission((perm) => {
        setMicPermission(perm);
      });

      const stateMgr = controller.getStateManager();
      const unsubState = stateMgr.subscribe((st, err) => {
        setElmoVoiceState(st);
        setVoiceError(err);
        setIsVoiceActive(st !== "STANDBY" && st !== "ERROR");
        if (st === "STANDBY") {
          setIsPaused(false);
        }
      });

      const unsubLang = controller.getLanguageContextService().subscribe((ctx) => {
        setCurrentVoiceLanguage(ctx.responseLanguage);
      });

      // Run initial security audit
      const audit = RLSAuditService.runCrossTenantIsolationAudit();
      setAuditResult(audit);

      return () => {
        unsubPermission();
        unsubState();
        unsubLang();
      };
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleVoiceMode = async () => {
    if (!controllerRef.current) return;
    if (isVoiceActive) {
      controllerRef.current.stopVoiceMode();
      setIsVoiceActive(false);
      setIsPaused(false);
      setLiveTranscript("");
    } else {
      setLiveTranscript("");
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

  const handleInterrupt = () => {
    if (!controllerRef.current) return;
    controllerRef.current.interrupt();
    setElmoVoiceState("INTERRUPTED");
    setTimeout(() => {
      setElmoVoiceState("LISTENING");
    }, 400);
  };

  const handleToggleManualMic = async () => {
    if (!controllerRef.current) return;
    await controllerRef.current.toggleManualMicrophone();
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Transition state
    setElmoVoiceState("PROCESSING");

    const sess = session;
    const orgId = sess?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
    const userId = sess?.user?.id || "00000000-0000-0000-0000-000000000001";

    try {
      const elmo = ELMOIntelligenceService.getInstance();
      const response = await elmo.processMessage({
        userId,
        organizationId: orgId,
        conversationId: activeConversationId || undefined,
        message: text,
        inputMode: "text",
      });

      if (response.conversationId) {
        setActiveConversationId(response.conversationId);
        if (controllerRef.current) {
          controllerRef.current.updateContext(orgId, userId, response.conversationId);
        }
      }

      const assistantMsg: ConversationMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If voice is active, speak aloud
      if (isVoiceActive && !isPaused && controllerRef.current) {
        setElmoVoiceState("ELMO_SPEAKING");
        await controllerRef.current.getTTS().speak(response.text);
        setElmoVoiceState("LISTENING");
      } else {
        setElmoVoiceState("STANDBY");
      }
    } catch (err: any) {
      setElmoVoiceState("ERROR");
      setVoiceError({
        code: "gemini_error",
        message: "Failed to synthesize response.",
        recoverable: true,
      });
    }
  };

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const audit = RLSAuditService.runCrossTenantIsolationAudit();
      setAuditResult(audit);
      setIsAuditing(false);
    }, 400);
  };

  const currentMeta = CORE_STATE_METADATA[elmoVoiceState] || CORE_STATE_METADATA.STANDBY;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* ========================================================= */}
      {/* TOP STATUS BAR & MATRIX SWITCHER                          */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DigitalBadge variant="blue" dot pulsing>
              ELMO NEURAL MATRIX // v3.2
            </DigitalBadge>
            <span className="text-xs font-mono text-zinc-400">
              {organization?.name || "Autonomous Business Operations"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 font-sans">
            AI Command Center
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Microphone Hardware Status Indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono backdrop-blur-md transition-colors",
              micPermission === "granted"
                ? "border-cyan-500/30 bg-cyan-950/20 text-cyan-300"
                : micPermission === "denied"
                ? "border-rose-500/40 bg-rose-950/30 text-rose-300"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
            )}
            title="Microphone permission and hardware lifecycle status"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                micPermission === "granted"
                  ? isVoiceActive
                    ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_#00D2FF]"
                    : "bg-cyan-400"
                  : micPermission === "denied"
                  ? "bg-rose-500"
                  : "bg-zinc-600"
              )}
            />
            <span className="uppercase font-semibold">
              MIC: {micPermission === "granted" ? (isVoiceActive ? "ACTIVE" : "STANDBY") : micPermission}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#060D18] p-1 rounded-xl border border-[#14233A]">
            <button
              onClick={() => setActiveTab("command")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono transition-all",
                activeTab === "command"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,210,255,0.4)]"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Command Matrix
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono transition-all",
                activeTab === "security"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,210,255,0.4)]"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              RLS Security Telemetry
            </button>
          </div>
        </div>
      </div>

      {activeTab === "command" ? (
        <>
          {/* ========================================================= */}
          {/* MAIN COMMAND SPLIT: CENTER COMMAND AREA & LIVE CONV PANEL */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ------------------------------------------------------- */}
            {/* LEFT / CENTER COMMAND AREA (7 Cols)                     */}
            {/* ------------------------------------------------------- */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-[#060D1A]/95 border border-[#14233D] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden">
              {/* Background Blue Neon Glow */}
              <div
                className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl pointer-events-none transition-colors duration-700",
                  elmoVoiceState === "ELMO_SPEAKING" || elmoVoiceState === "LISTENING" || elmoVoiceState === "USER_SPEAKING"
                    ? "bg-cyan-500/15"
                    : isVoiceActive
                    ? "bg-blue-600/15"
                    : "bg-blue-900/10"
                )}
              />

              {/* Cyber Corner Marks */}
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400" />

              {/* Header Telemetry */}
              <div className="relative z-10 flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-[#14233D]">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest">
                    ELMO COMMAND CENTER
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    {ELMO_IDENTITY.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <VoiceLanguageSelector
                    controller={controllerRef.current}
                    currentLanguage={currentVoiceLanguage}
                    onLanguageChange={(code) => setCurrentVoiceLanguage(code)}
                    size="sm"
                  />
                  <VoiceDebugPanel />
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                    STATUS: READY
                  </span>
                  {isVoiceActive && (
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-500/40 animate-pulse shadow-[0_0_10px_rgba(0,210,255,0.3)]">
                      <Radio className="w-3 h-3" />
                      CONTINUOUS LOOP ACTIVE
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-zinc-500">
                    LATENCY: &lt;180ms
                  </span>
                </div>
              </div>

              {/* Central Floating AI Core Display (Official ELMO Visual Identity) */}
              <div className="relative z-10 my-8 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <div className="relative z-10 p-2 flex items-center justify-center">
                    <ElmoCore
                      voiceState={elmoVoiceState}
                      size="lg"
                      interactive={true}
                      enableWorkforceSockets={true}
                      onStateChange={(s) => setElmoVoiceState(s as VoiceState)}
                    />
                  </div>
                </div>

                {/* State Title & Subtext Badge */}
                <div className="mt-4 text-center space-y-1">
                  <p className="text-sm font-bold text-white tracking-wide">
                    &ldquo;How can I help you today?&rdquo;
                  </p>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-1 rounded-full border shadow-[0_0_15px_rgba(0,210,255,0.2)]",
                    currentMeta.statusBadge || "bg-[#081224] border-cyan-500/40"
                  )}>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00D2FF]" />
                    <span className="text-xs font-mono font-bold text-white tracking-wider">
                      ELMO : {currentMeta.label}
                    </span>
                  </div>
                  <p className="text-xs font-sans text-zinc-400 max-w-sm">
                    {currentMeta.subtext}
                  </p>
                </div>

                {/* Real-Time Audio Visualizer */}
                <div className="w-full max-w-xs mt-4">
                  <AudioVisualizer
                    voiceState={elmoVoiceState}
                    audioManager={audioManagerRef.current || undefined}
                    barsCount={28}
                  />
                </div>
              </div>

              {/* Bottom Command Controls */}
              <div className="relative z-10 pt-4 border-t border-[#14233D] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Main Full-Screen Voice Mode Trigger */}
                  <button
                    onClick={() => setIsFullScreenSpeakOpen(true)}
                    id="talk-to-elmo-btn"
                    className="flex-1 min-w-[220px] px-5 py-3 rounded-2xl text-xs font-mono font-bold transition-all duration-200 active:scale-98 flex items-center justify-center gap-2.5 shadow-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 text-black hover:brightness-110 shadow-[0_0_25px_rgba(0,210,255,0.5)]"
                  >
                    <Mic className="w-4 h-4 text-black" />
                    <span>TALK TO ELMO</span>
                  </button>

                  {/* Secondary In-Dashboard Voice Toggle */}
                  <button
                    onClick={handleToggleVoiceMode}
                    className={cn(
                      "px-4 py-3 rounded-2xl text-xs font-mono font-bold transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 shadow-sm border",
                      isVoiceActive
                        ? "bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900"
                        : "bg-[#091428] border-[#182C4E] text-zinc-300 hover:text-white"
                    )}
                  >
                    {isVoiceActive ? (
                      <>
                        <MicOff className="w-4 h-4 text-rose-300" />
                        <span>STOP VOICE</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-cyan-400" />
                        <span>QUICK MIC</span>
                      </>
                    )}
                  </button>

                  {/* Secondary Quick Controls */}
                  {isVoiceActive && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={isPaused ? handleResumeVoiceMode : handlePauseVoiceMode}
                        className="px-3.5 py-3 rounded-2xl bg-[#091428] border border-[#182C4E] hover:border-cyan-400/50 text-xs font-mono text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                        title={isPaused ? "Resume Voice Loop" : "Pause Voice Loop"}
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 text-cyan-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{isPaused ? "RESUME" : "PAUSE"}</span>
                      </button>

                      <button
                        onClick={handleInterrupt}
                        className="px-3.5 py-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.2)]"
                        title="Barge-in Interrupt"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>INTERRUPT</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleToggleManualMic}
                    className="px-3.5 py-3 rounded-2xl bg-[#091428] border border-[#182C4E] hover:border-cyan-400/50 text-xs font-mono text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                    title="Manual Microphone Toggle"
                  >
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MIC</span>
                  </button>
                </div>

                {/* Operational State Switcher (Rapid Testing / State Simulation) */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    SIMULATE OPERATIONAL STATE:
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(
                      [
                        "STANDBY",
                        "LISTENING",
                        "USER_SPEAKING",
                        "PROCESSING",
                        "ELMO_SPEAKING",
                        "INTERRUPTED",
                        "ERROR",
                      ] as VoiceState[]
                    ).map((st) => (
                      <button
                        key={st}
                        onClick={() => setElmoVoiceState(st)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-colors",
                          elmoVoiceState === st
                            ? "bg-cyan-400 text-black font-bold shadow-[0_0_8px_#00E5FF]"
                            : "text-zinc-500 hover:text-zinc-300 bg-[#081020]"
                        )}
                      >
                        {st.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error Banner if voice fails */}
              {voiceError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{voiceError.message}</span>
                  </div>
                  <button
                    onClick={() => controllerRef.current?.fallbackToText()}
                    className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-[11px] font-mono font-semibold"
                  >
                    Text Fallback
                  </button>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------- */}
            {/* RIGHT PANEL: LIVE CONVERSATION & CONTROLS (5 Cols)      */}
            {/* ------------------------------------------------------- */}
            <div className="lg:col-span-5 h-[620px] lg:h-auto">
              <LiveConversationPanel
                messages={messages}
                voiceState={elmoVoiceState}
                liveTranscript={liveTranscript}
                isVoiceActive={isVoiceActive}
                isPaused={isPaused}
                micPermission={micPermission}
                onToggleVoiceMode={handleToggleVoiceMode}
                onPauseVoiceMode={handlePauseVoiceMode}
                onResumeVoiceMode={handleResumeVoiceMode}
                onInterrupt={handleInterrupt}
                onToggleManualMic={handleToggleManualMic}
                onSendMessage={handleSendMessage}
                className="h-full"
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* BOTTOM COMMAND AREA: METRICS, ACTIVITY, TASKS & INSIGHTS  */}
          {/* ========================================================= */}
          <BottomOverviewArea onAskELMO={handleSendMessage} />

          {/* ========================================================= */}
          {/* SPECIALIST WORKFORCE PREVIEW MODAL & CARDS                */}
          {/* ========================================================= */}
          <div className="p-6 rounded-2xl bg-[#060D1A]/95 border border-[#14233D] shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#14233D]">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    SPECIALIST AI WORKFORCE
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                  Autonomous agents reporting directly to ELMO (Standby Preview)
                </p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30">
                7/7 OPERATIONAL STANDBY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
              {WORKFORCE_EMPLOYEES.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onDeploy={(emp) => setSelectedEmployee(emp)}
                />
              ))}

              {/* Commission Specialist Card */}
              <div className="rounded-xl border border-dashed border-[#162845] p-4 flex flex-col items-center justify-center text-center gap-2 text-zinc-400 hover:border-cyan-400/50 hover:text-cyan-300 transition-colors cursor-pointer bg-[#070D18]/50 min-h-[160px]">
                <div className="w-9 h-9 rounded-lg bg-[#0E1A2E] border border-[#1A3254] flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono font-semibold">
                  + Commission Specialist
                </span>
                <p className="text-[10px] text-zinc-500 font-sans max-w-[140px]">
                  Add custom agent to ELMO roster
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ========================================================= */
        /* RLS SECURITY TELEMETRY AUDIT TAB                          */
        /* ========================================================= */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#070D18] border border-cyan-500/30 shadow-[0_0_25px_rgba(0,210,255,0.1)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#14233A]">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-bold text-white font-sans">
                    Multi-Tenant Isolation & Supabase RLS Telemetry
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1 font-sans">
                  Live verification confirming that organization data cannot leak across tenant boundaries.
                </p>
              </div>

              <button
                onClick={handleRunAudit}
                disabled={isAuditing}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,210,255,0.4)] disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isAuditing && "animate-spin")} />
                Run Live RLS Audit
              </button>
            </div>

            {/* Audit Status Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
              {auditResult?.details.map((testItem, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#0A1424] border border-[#162A48] flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 font-mono">
                    <p className="text-xs font-semibold text-zinc-100">{testItem.test}</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {testItem.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMPLOYEE DIRECTIVE MODAL (INTERACTIVE DEMO)                */}
      {/* ========================================================= */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-[#070D18] border border-cyan-500/40 p-6 shadow-[0_0_30px_rgba(0,210,255,0.2)] relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0E1A2E] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[#14233A]">
              <div className="w-12 h-12 rounded-xl bg-[#0E1A2E] border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <selectedEmployee.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">
                  {selectedEmployee.role}
                </h3>
                <p className="text-xs font-mono text-cyan-400">
                  {selectedEmployee.codename} • {selectedEmployee.category} Unit (Standby Preview)
                </p>
              </div>
            </div>

            <div className="my-4 space-y-3 font-sans">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1 uppercase tracking-wider">
                  Specialist Capabilities
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployee.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded bg-[#0E1A2E] border border-[#182C48] text-xs font-mono text-zinc-200"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1 uppercase tracking-wider">
                  Issue Directive via ELMO
                </label>
                <textarea
                  rows={3}
                  defaultValue={`ELMO, please have ${selectedEmployee.role} analyze our current conversion metrics and report back.`}
                  className="w-full rounded-lg bg-[#040812] border border-[#14243C] p-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#14233A]">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSendMessage(`Please have ${selectedEmployee.role} analyze our current conversion metrics and report back.`);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-blue-600 to-cyan-400 text-black hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,210,255,0.4)]"
              >
                Dispatch Directive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Natural Voice AI Command Center */}
      <FullScreenSpeakMode
        isOpen={isFullScreenSpeakOpen}
        onClose={() => setIsFullScreenSpeakOpen(false)}
        initialMessages={messages}
        organizationId={organization?.id}
        userId={session?.user?.id}
      />
    </div>
  );
}
