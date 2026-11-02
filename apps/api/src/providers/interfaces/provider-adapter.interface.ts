import { MessagingChannel } from '@prisma/client';

export interface ProviderConnectionContext {
  provider: string;
  channel: MessagingChannel;
  credentials: Record<string, string>;
  senderId?: string | null;
  senderName?: string | null;
  providerAccountId?: string | null;
}

export interface ProviderConnectionResult {
  success: boolean;
  message: string;
}

export interface ProviderAdapter {
  testConnection(
    context: ProviderConnectionContext,
  ): Promise<ProviderConnectionResult>;
}