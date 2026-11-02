import { Module } from '@nestjs/common';

import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { CredentialEncryptionService } from './credential-encryption.service';

import { MetaWhatsAppAdapter } from './adapters/meta-whatsapp.adapter';

@Module({
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    CredentialEncryptionService,
    MetaWhatsAppAdapter,
  ],
  exports: [
    ProvidersService,
    CredentialEncryptionService,
    MetaWhatsAppAdapter,
  ],
})
export class ProvidersModule {}