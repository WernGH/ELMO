"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Square,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Shield,
  Clock,
  Terminal,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Eye,
} from "lucide-react";
import { ELMO_IDENTITY } from "@/lib/constants";
import { Conversation, Message, MessageRole } from "@/types/chat.types";
import { AuthService } from "@/services/auth.service";
import { UserSession } from "@/types/auth.types";
import { cn } from "@/lib/utils";
import { useVoice } from "@/hooks/useVoice";
import { VoiceHUD } from "@/components/voice/VoiceHUD";
import { VoiceSettingsModal } from "@/components/voice/VoiceSettingsModal";
import { FullScreenSpeakMode } from "@/components/voice/FullScreenSpeakMode";
import { ElmoCore } from "@/components/elmo";
import { AgentPlanProgress } from "@/components/dashboard/AgentPlanProgress";
import { WebsitePreviewModal } from "@/components/dashboard/WebsitePreviewModal";
import { PreviewPayload, ExecutionStep } from "@/services/agentic/types/agentic.types";

const STARTER_PROMPTS = [
  {
    title: "Capabilities Overview",
    prompt: "ELMO, what can you help me with?",
    description: "Understand ELMO's mandate as AI CEO and workforce coordinator.",
  },
  {
    title: "Operational Status",
    prompt: "Provide an executive operational status and workforce readiness briefing.",
    description: "Review current Phase 1 and 2 foundation security and readiness.",
  },
  {
    title: "AI Workforce Roadmap",
    prompt: "Help me outline an organizational plan for onboarding our specialist AI workforce.",
    description: "Strategize engineering, marketing, and operations role definitions.",
  },
  {
    title: "Executive Directive",
    prompt: "I want to formulate a new corporate directive. Guide me through the governance criteria.",
    description: "Draft high-level directives with risk tiers and approval criteria.",
  },
];

export default function ELMOChatPage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const [currentlySpeakingMsgId, setCurrentlySpeakingMsgId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullScreenSpeakOpen, setIsFullScreenSpeakOpen] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<{
    detectedLanguage?: string;
    detectedLanguageCode?: string;
    responseLanguage?: string;
    confidence?: number;
    isExplicitOverride?: boolean;
    isTranslation?: boolean;
  } | null>(null);

  const [activePlanSteps, setActivePlanSteps] = useState<ExecutionStep[]>([]);
  const [previewModalPayload, setPreviewModalPayload] = useState<PreviewPayload | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Initialize Voice CEO integration
  const voice = useVoice({
    initialMode: "text",
    onSpeechComplete: (spokenText) => {
      // Spoken query from Human Superior (e.g. "ELMO, what tasks are currently running?")
      handleSendMessage(spokenText, true);
    },
    onWakeWordOnly: async () => {
      // When user says only "Hey ELMO":
      if (voice.voiceSettings.voiceResponse) {
        await voice.speak("Yes, I'm listening.");
      }
      if (voice.voiceSettings.autoListenAfterWake) {
        await voice.startListening();
      }
    },
  });

  // When speaking completes, clear speaking ID
  useEffect(() => {
    if (voice.state !== "speaking") {
      setCurrentlySpeakingMsgId(null);
    }
  }, [voice.state]);

  // When in text mode, sync interim transcript to input value
  useEffect(() => {
    if (voice.mode === "text" && voice.transcript) {
      setInputValue(voice.transcript);
    }
  }, [voice.mode, voice.transcript]);

  const authService = AuthService.getInstance();

  // Scroll to bottom whenever messages or stream update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, isStreaming]);

  // Load session and conversation list on mount
  useEffect(() => {
    async function init() {
      const sess = await authService.getSession();
      setSession(sess);

      const orgId = sess.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const userId = sess.user?.id || "00000000-0000-0000-0000-000000000001";

      await fetchConversations(orgId, userId);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConversations = async (orgId: string, userId: string) => {
    try {
      const res = await fetch(`/api/conversations?organizationId=${orgId}&userId=${userId}`);
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setConversations(json.data);
        if (json.data.length > 0) {
          // Select most recent conversation
          const latestId = json.data[0].id;
          setActiveConvId(latestId);
          await loadConversationMessages(latestId, orgId, userId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  const loadConversationMessages = async (convId: string, orgId: string, userId: string) => {
    setIsLoadingMessages(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/conversations/${convId}?organizationId=${orgId}&userId=${userId}`
      );
      const json = await res.json();
      if (json.data?.messages) {
        setMessages(json.data.messages);
      }
    } catch (err) {
      setErrorMessage("Failed to load conversation history.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    if (isStreaming) {
      handleStopGeneration();
    }
    setActiveConvId(convId);
    const orgId = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";
    await loadConversationMessages(convId, orgId, userId);
  };

  const handleNewConversation = async () => {
    if (isStreaming) {
      handleStopGeneration();
    }
    const orgId = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          userId,
          title: "Executive Strategic Session",
        }),
      });
      const json = await res.json();
      if (json.data) {
        setConversations((prev) => [json.data, ...prev]);
        setActiveConvId(json.data.id);
        setMessages([]);
        setErrorMessage(null);
      }
    } catch (err) {
      setErrorMessage("Failed to create new conversation.");
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    const orgId = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";

    try {
      const res = await fetch(
        `/api/conversations/${convId}?organizationId=${orgId}&userId=${userId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        const remaining = conversations.filter((c) => c.id !== convId);
        setConversations(remaining);
        if (activeConvId === convId) {
          if (remaining.length > 0) {
            setActiveConvId(remaining[0].id);
            await loadConversationMessages(remaining[0].id, orgId, userId);
          } else {
            setActiveConvId(null);
            setMessages([]);
          }
        }
      }
    } catch (err) {
      setErrorMessage("Failed to delete conversation.");
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    voice.stopSpeaking();
    setIsStreaming(false);

    // If there was streaming text accumulated, commit it as a completed message locally
    if (streamingText.trim().length > 0 && activeConvId) {
      const partialMsg: Message = {
        id: `msg-stopped-${Date.now()}`,
        conversation_id: activeConvId,
        organization_id: session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111",
        role: "assistant",
        content: streamingText,
        metadata: { status: "complete", stoppedEarly: true },
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, partialMsg]);
    }
    setStreamingText("");
  };

  const handleSendMessage = async (promptToSend?: string, fromVoice = false) => {
    const text = (promptToSend || inputValue).trim();
    if (!text || isStreaming) return;

    // Immediately stop any active speech playback
    voice.stopSpeaking();
    setCurrentlySpeakingMsgId(null);

    setErrorMessage(null);
    setLastUserPrompt(text);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const orgId = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";

    // Optimistically add user message to UI
    const tempUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      conversation_id: activeConvId || "pending",
      organization_id: orgId,
      role: "user",
      content: text,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamingText("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: activeConvId,
          organizationId: orgId,
          userId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No readable stream response received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentBuffer = "";
      let fullAssistantText = "";
      let receivedPreviewPayload: PreviewPayload | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        currentBuffer += decoder.decode(value, { stream: true });
        const events = currentBuffer.split("\n\n");
        currentBuffer = events.pop() || "";

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;

          const lines = rawEvent.split("\n");
          let eventType = "message";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.replace("event: ", "").trim();
            } else if (line.startsWith("data: ")) {
              eventData = line.replace("data: ", "").trim();
            }
          }

          if (eventType === "conversation") {
            try {
              const convData = JSON.parse(eventData);
              if (convData.conversationId && (!activeConvId || activeConvId === "pending")) {
                setActiveConvId(convData.conversationId);
                // Refresh conversations list to update titles
                fetchConversations(orgId, userId);
              }
            } catch {}
          } else if (eventType === "language") {
            try {
              const langData = JSON.parse(eventData);
              setActiveLanguage(langData);
            } catch {}
          } else if (eventType === "token") {
            try {
              const parsed = JSON.parse(eventData);
              if (parsed.text) {
                fullAssistantText += parsed.text;
                setStreamingText(fullAssistantText);
              }
            } catch {}
          } else if (eventType === "plan_step") {
            try {
              const stepData = JSON.parse(eventData);
              setActivePlanSteps((prev) => {
                const exists = prev.find((s) => s.id === stepData.id);
                if (exists) {
                  return prev.map((s) => (s.id === stepData.id ? { ...s, ...stepData } : s));
                }
                return [...prev, stepData];
              });
            } catch {}
          } else if (eventType === "metadata") {
            try {
              const meta = JSON.parse(eventData);
              if (meta.previewPayload) {
                receivedPreviewPayload = meta.previewPayload;
                setPreviewModalPayload(meta.previewPayload);
                setIsPreviewModalOpen(true);
              }
              if (meta.executionPlan?.steps) {
                setActivePlanSteps(meta.executionPlan.steps);
              }
            } catch {}
          } else if (eventType === "error") {
            try {
              const parsed = JSON.parse(eventData);
              setErrorMessage(parsed.error || "Generation error occurred.");
            } catch {}
          } else if (eventType === "done") {
            // Stream complete
          }
        }
      }

      // Stream completed successfully, commit message
      if (fullAssistantText) {
        const finalAssistantMsg: Message = {
          id: `msg-${Date.now()}`,
          conversation_id: activeConvId || "active",
          organization_id: orgId,
          role: "assistant",
          content: fullAssistantText,
          metadata: {
            status: "complete",
            model: "gemini-2.5-flash",
            preview_payload: receivedPreviewPayload || previewModalPayload,
          },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, finalAssistantMsg]);

        // Auto-speak response if query was spoken or currently in Voice Mode
        if (fromVoice || voice.mode === "voice") {
          if (voice.voiceSettings.voiceResponse) {
            voice.speak(fullAssistantText);
            setCurrentlySpeakingMsgId(finalAssistantMsg.id);
          }
          // Open hands-free conversation window so user can speak follow-ups without repeating wake word
          voice.startConversationWindow(voice.voiceSettings.conversationTimeoutSeconds);
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        // Handled cleanly by stop generation
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        setErrorMessage(errMsg);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    if (lastUserPrompt) {
      // Remove last errored message if any
      handleSendMessage(lastUserPrompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render markdown text formatting cleanly without external dependencies
  const formatMarkdown = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-bold text-elmo-cyan mt-3 mb-1 tracking-wide">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-base font-extrabold text-white mt-4 mb-2">
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={idx} className="text-lg font-black text-white mt-4 mb-2">
            {line.replace("# ", "")}
          </h2>
        );
      }
      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const bulletText = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-elmo-text leading-relaxed">
            <span
              dangerouslySetInnerHTML={{
                __html: bulletText
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                  .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-surface-300 font-mono text-[11px] text-elmo-cyan">$1</code>'),
              }}
            />
          </li>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      // Standard paragraph
      return (
        <p
          key={idx}
          className="text-xs text-elmo-text leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
              .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-surface-300 font-mono text-[11px] text-elmo-cyan">$1</code>'),
          }}
        />
      );
    });
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex gap-4 max-w-7xl mx-auto overflow-hidden">
      {/* 1. Left Sidebar: Executive Conversation Sessions */}
      <aside className="w-72 flex-shrink-0 flex flex-col rounded-2xl bg-[#060A14]/90 border border-[#14233D] overflow-hidden">
        {/* Header & New Chat Action */}
        <div className="p-4 border-b border-[#14233D] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Executive Sessions
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 transition-all duration-150 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">
              No sessions yet. Click &quot;New Session&quot; to begin.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all duration-150",
                    isActive
                      ? "bg-gradient-to-r from-cyan-950/40 to-blue-950/20 border border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(0,210,255,0.1)]"
                      : "text-zinc-400 hover:text-white hover:bg-[#0A1324] border border-transparent"
                  )}
                >
                  <div className="flex items-start gap-2.5 overflow-hidden flex-1 pr-2">
                    <MessageSquare
                      className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        isActive ? "text-cyan-400" : "text-zinc-500"
                      )}
                    />
                    <div className="truncate">
                      <p className="font-semibold truncate">{conv.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(conv.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. Main Executive Command & Chat Panel */}
      <section className="flex-1 flex flex-col rounded-2xl bg-[#060A14]/90 border border-[#14233D] overflow-hidden relative">
        {/* CEO Status Header */}
        <div className="px-6 py-3.5 border-b border-[#14233D] bg-[#081020]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.35)] flex-shrink-0">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  {ELMO_IDENTITY.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {ELMO_IDENTITY.role}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Gemini 1.5
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Subordinate to Human Superior • Supervised Autonomy Mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Prominent Full-Screen Speak Mode Trigger */}
            <button
              type="button"
              onClick={() => setIsFullScreenSpeakOpen(true)}
              id="talk-to-elmo-btn"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 text-black font-mono font-bold text-xs shadow-[0_0_18px_rgba(0,210,255,0.45)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5 text-black" />
              <span>TALK TO ELMO</span>
            </button>

            {/* Mode Switcher: Text vs Voice */}
            <div className="flex items-center p-0.5 rounded-xl bg-[#081020] border border-[#162744]">
              <button
                type="button"
                onClick={() => voice.setMode("text")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  voice.mode === "text"
                    ? "bg-[#0E1A30] text-cyan-300 shadow-sm border border-cyan-500/30"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => voice.setMode("voice")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  voice.mode === "voice"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-600 text-black shadow-[0_0_12px_rgba(0,210,255,0.4)] font-bold"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice CEO</span>
              </button>
            </div>

            {activeLanguage && (
              <div
                id="elmo-lang-badge"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#08152B] border border-cyan-500/30 text-[10px] font-mono text-cyan-300"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>
                  {activeLanguage.isTranslation
                    ? `TRANSLATION: ${activeLanguage.responseLanguage?.toUpperCase()}`
                    : `LANG: ${activeLanguage.detectedLanguage?.toUpperCase()} → ${activeLanguage.responseLanguage?.toUpperCase()}`}
                </span>
              </div>
            )}

            <div className="h-4 w-px bg-[#14233D] hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="radar-online absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300 hidden sm:inline">STATUS: NOMINAL</span>
            </div>
          </div>
        </div>

        {/* Phase 3: Voice HUD when in Voice Mode */}
        {voice.mode === "voice" && (
          <div className="p-4 border-b border-[#14233D] bg-black/40">
            <VoiceHUD
              state={voice.state}
              transcript={voice.transcript}
              isFinal={voice.isFinal}
              error={voice.error}
              onStartListening={voice.startListening}
              onStopListening={voice.stopListening}
              onStopSpeaking={voice.stopSpeaking}
              onSwitchToText={() => voice.setMode("text")}
              onClearError={voice.clearError}
              isSTTSupported={voice.isSTTSupported}
              isTTSSupported={voice.isTTSSupported}
              wakeWordStatus={voice.wakeWordStatus}
              wakeWord={voice.voiceSettings.wakeWord}
              isInConversationWindow={voice.isInConversationWindow}
              conversationTimerSeconds={voice.conversationTimerSeconds}
              isMicrophoneActive={voice.isMicrophoneActive}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        )}

        {/* Messages Stream Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingMessages ? (
            <div className="h-full flex items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="text-xs font-mono">Retrieving encrypted session log...</span>
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            /* Empty State with Executive Starters & Floating AI Core */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-6">
              <div className="relative flex items-center justify-center mb-2">
                <ElmoCore
                  voiceState="STANDBY"
                  size="sm"
                  interactive={true}
                />
              </div>

              <h3 className="text-base font-bold text-white mt-2">&ldquo;How can I help you today?&rdquo;</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
                Autonomous operations and business intelligence active. Speak freely or select an executive directive below.
              </p>

              <div className="mt-4 mb-2">
                <button
                  type="button"
                  onClick={() => setIsFullScreenSpeakOpen(true)}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,210,255,0.45)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Mic className="w-4 h-4 text-black" />
                  <span>START FULL-SCREEN SPEAK MODE</span>
                </button>
              </div>

              {/* Starter Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-6 text-left">
                {STARTER_PROMPTS.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="p-3.5 rounded-xl bg-[#081020]/90 border border-[#162744] hover:border-cyan-400/60 hover:bg-[#0E1A30] hover:shadow-[0_0_15px_rgba(0,210,255,0.12)] transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-300">
                      <span>{starter.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
                      {starter.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Render Messages */
            <>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 text-xs",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(0,210,255,0.3)]">
                        <Bot className="w-4 h-4 text-black" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-2xl rounded-2xl p-4 shadow-md",
                        isUser
                          ? "bg-[#0B1526] border border-[#1C3050] text-white"
                          : "bg-[#081020] border border-[#162744] text-zinc-200"
                      )}
                    >
                      {/* Sender Tag */}
                      <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-[#162744] text-[10px] font-mono text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-bold uppercase", isUser ? "text-cyan-300" : "text-cyan-400")}>
                            {isUser ? "Human Superior" : "ELMO AI CEO"}
                          </span>
                          {!isUser && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              Verified Neural Output
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isUser && voice.isTTSSupported && (
                            <button
                              type="button"
                              onClick={() => {
                                if (voice.state === "speaking" && currentlySpeakingMsgId === msg.id) {
                                  voice.stopSpeaking();
                                  setCurrentlySpeakingMsgId(null);
                                } else {
                                  voice.speak(msg.content);
                                  setCurrentlySpeakingMsgId(msg.id);
                                }
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
                              title={voice.state === "speaking" && currentlySpeakingMsgId === msg.id ? "Stop audio playback" : "Read aloud"}
                            >
                              {voice.state === "speaking" && currentlySpeakingMsgId === msg.id ? (
                                <>
                                  <VolumeX className="w-3 h-3 text-cyan-400 animate-pulse" />
                                  <span className="text-cyan-400">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3" />
                                  <span>Speak</span>
                                </>
                              )}
                            </button>
                          )}
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-1 text-xs">{formatMarkdown(msg.content)}</div>

                      {/* Web Landing Page Preview Button */}
                      {Boolean(msg.metadata?.preview_payload || msg.metadata?.previewPayload) && (
                        <div className="mt-3 pt-3 border-t border-[#162744]">
                          <button
                            type="button"
                            onClick={() => {
                              const payload = (msg.metadata?.preview_payload || msg.metadata?.previewPayload) as PreviewPayload;
                              setPreviewModalPayload(payload);
                              setIsPreviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Live Landing Page</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Real-time Streaming Response Card */}
              {isStreaming && (
                <div className="flex gap-3 text-xs justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(0,210,255,0.3)]">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                  <div className="max-w-2xl rounded-2xl p-4 bg-[#081020] border border-cyan-400/50 text-zinc-200 shadow-[0_0_20px_rgba(0,210,255,0.15)] relative">
                    <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-[#162744] text-[10px] font-mono text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase text-cyan-400">ELMO AI CEO</span>
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 animate-pulse">
                          <Sparkles className="w-2.5 h-2.5" /> Streaming Response
                        </span>
                      </div>
                    </div>

                    {/* Active Multi-Agent Plan Progress */}
                    {activePlanSteps.length > 0 && (
                      <AgentPlanProgress steps={activePlanSteps} />
                    )}

                    <div className="space-y-1 text-xs">
                      {streamingText ? (
                        formatMarkdown(streamingText)
                      ) : (
                        <div className="flex items-center gap-2 py-2 text-zinc-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span className="font-mono text-[11px]">Synthesizing executive response...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner with Retry */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  {lastUserPrompt && (
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-semibold text-xs border border-red-500/40 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 3. Bottom Directive Input Bar */}
        <div className="p-4 border-t border-[#14233D] bg-[#050811]/90">
          <div className="relative flex flex-col gap-2">
            <div className="relative flex items-end gap-2 bg-[#081020] border border-[#162744] focus-within:border-cyan-400/60 rounded-xl p-2.5 transition-colors shadow-inner">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Issue an executive directive or ask ELMO a question (e.g., 'ELMO, what can you help me with?')..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 resize-none focus:outline-none max-h-36 py-1 px-1 leading-relaxed"
              />

              {/* Inline Voice Dictation Button */}
              {voice.isSTTSupported && !isStreaming && (
                <button
                  type="button"
                  onClick={() => {
                    if (voice.state === "listening") {
                      voice.stopListening();
                    } else {
                      voice.startListening();
                    }
                  }}
                  title={voice.state === "listening" ? "Stop dictation" : "Dictate via microphone"}
                  className={cn(
                    "p-2 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all active:scale-95",
                    voice.state === "listening"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                      : "bg-[#0E1A30] border-[#1C3050] text-zinc-400 hover:text-white hover:border-cyan-500/40"
                  )}
                >
                  {voice.state === "listening" ? (
                    <MicOff className="w-3.5 h-3.5 text-cyan-300" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim()}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all duration-150 active:scale-95",
                    inputValue.trim()
                      ? "bg-gradient-to-r from-cyan-400 to-blue-600 text-black shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110"
                      : "bg-[#0E1A30] text-zinc-500 cursor-not-allowed"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Direct</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
              <span>Press [Enter] to transmit directive • [Shift+Enter] for multiline</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                RLS Encrypted Session
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={voice.voiceSettings}
        onUpdateSettings={voice.updateVoiceSettings}
      />

      {/* Full-Screen Natural Voice AI Command Center */}
      <FullScreenSpeakMode
        isOpen={isFullScreenSpeakOpen}
        onClose={() => setIsFullScreenSpeakOpen(false)}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          created_at: m.created_at,
        }))}
        organizationId={session?.activeOrganizationId || undefined}
        userId={session?.user?.id}
      />

      {/* Interactive Website & Landing Page Preview Modal */}
      <WebsitePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        preview={previewModalPayload}
        onApplyEdit={(editPrompt) => handleSendMessage(editPrompt)}
      />
    </div>
  );
}
