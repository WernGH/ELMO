import { Json } from "./database.types";

export type MessageRole = "user" | "assistant" | "system";

export type ResponseType =
  | "ANSWER"
  | "QUESTION"
  | "SUGGESTION"
  | "PLAN"
  | "TASK"
  | "REQUIRES_APPROVAL"
  | "ERROR";

export interface Conversation {
  id: string;
  organization_id: string;
  title: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageMetadata {
  model?: string;
  provider?: string;
  tokensUsed?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  isThinking?: boolean;
  status?: "pending" | "streaming" | "complete" | "error";
  errorMessage?: string;
  latencyMs?: number;
  // Unified Multilingual & Conversational Intelligence Fields
  input_mode?: "text" | "voice";
  inputMethod?: "text" | "voice";
  language_code?: string;
  language_name?: string;
  language_source?: "voice" | "text" | "explicit";
  language_confidence?: number;
  response_language?: string;
  message_type?: ResponseType;
  intent?: string;
  is_translation?: boolean;
  is_clarification?: boolean;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversation_id: string;
  organization_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata;
  created_at: string;
}

export interface AIUsageRecord {
  organization_id: string;
  user_id: string;
  conversation_id: string;
  provider: string;
  model: string;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestType: string;
}

export interface ChatContext {
  user: {
    id: string;
    displayName: string;
    email?: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    autonomyMode: string;
    elmoStatus: string;
  };
  conversation: {
    id: string;
    title: string;
  };
  recentMessages: {
    role: MessageRole;
    content: string;
  }[];
  systemInstruction: string;
  memories?: string[];
  activeContinuity?: Record<string, unknown>;
  userContext?: unknown;
  businessContext?: unknown;
}

export interface GeminiModelConfig {
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiPromptMessage {
  role: MessageRole;
  content: string;
}

export interface GeminiResponse {
  text: string;
  model: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface StreamChunk {
  type: "token" | "metadata" | "error" | "done";
  text?: string;
  metadata?: MessageMetadata;
  error?: string;
}

export interface LLMGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  history?: { role: MessageRole; content: string }[];
  config?: GeminiModelConfig;
  abortSignal?: AbortSignal;
}

export interface LLMProvider {
  readonly name: string;
  generateResponse(options: LLMGenerateOptions): Promise<GeminiResponse>;
  generateStream(options: LLMGenerateOptions): AsyncGenerator<StreamChunk, void, unknown>;
}
