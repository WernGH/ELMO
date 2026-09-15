/**
 * Omnichannel & Third-Party Integration Types
 * For future phases: WhatsApp, Meta (Facebook, Instagram), Email, Calendar, CRM, Voice
 */

export type IntegrationChannel =
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "email"
  | "calendar"
  | "crm"
  | "voice";

export type IntegrationStatus = "connected" | "disconnected" | "error" | "pending_auth";

export interface ChannelIntegrationConfig {
  id: string;
  organizationId: string;
  channel: IntegrationChannel;
  name: string;
  status: IntegrationStatus;
  credentialsRef?: string; // Secure vault reference, never plain secret in DB
  webhookEndpoint?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
