import { ChannelIntegrationConfig, IntegrationChannel } from "@/types/future/integrations.types";

/**
 * Interface contract for external communication channels & integrations (Phase 2+)
 * WhatsApp, Facebook, Instagram, Email, Calendar, CRM, Voice
 */
export interface IOmnichannelAdapter {
  channel: IntegrationChannel;
  connect(config: ChannelIntegrationConfig): Promise<boolean>;
  sendMessage(to: string, content: string, metadata?: Record<string, unknown>): Promise<{ messageId: string }>;
  receiveWebhook(payload: unknown): Promise<{ handled: boolean; sender: string; text: string }>;
}
