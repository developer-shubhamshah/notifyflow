import {
  Injectable,
} from '@nestjs/common';

import {
  ProviderAdapter,
  ProviderConnectionContext,
  ProviderConnectionResult,
} from '../interfaces/provider-adapter.interface';

@Injectable()
export class MetaWhatsAppAdapter implements ProviderAdapter {
  async testConnection(
    context: ProviderConnectionContext,
  ): Promise<ProviderConnectionResult> {
    const accessToken = context.credentials.accessToken;
    const phoneNumberId =
      context.credentials.phoneNumberId || context.senderId;

    if (!accessToken || !phoneNumberId) {
      return {
        success: false,
        message: 'Meta access token and phone number ID are required.',
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!response.ok) {
        return {
          success: false,
          message: 'Meta WhatsApp connection validation failed. Check your credentials and phone number ID.',
        };
      }

      const data = await response.json();

      if (data.id !== phoneNumberId) {
        return {
          success: false,
          message: 'Meta returned a different phone number ID.',
        };
      }

      return {
        success: true,
        message: 'Meta WhatsApp connection verified successfully.',
      };
    } catch {
      return {
        success: false,
        message: 'Unable to connect to Meta WhatsApp API. Check network connectivity and credentials.',
      };
    }
  }
}