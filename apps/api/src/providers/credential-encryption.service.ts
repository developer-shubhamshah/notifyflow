
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

export interface EncryptedCredentials {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
}

@Injectable()
export class CredentialEncryptionService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>(
      'PROVIDER_ENCRYPTION_KEY',
    );

    if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
      throw new InternalServerErrorException(
        'PROVIDER_ENCRYPTION_KEY must be a valid 64-character hexadecimal key',
      );
    }

    this.encryptionKey = Buffer.from(key, 'hex');
  }

  encrypt(credentials: Record<string, string>): EncryptedCredentials {
    const iv = randomBytes(12);

    const cipher = createCipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );

    const plaintext = JSON.stringify(credentials);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      version: 1,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: ciphertext.toString('hex'),
    };
  }

  decrypt(encrypted: EncryptedCredentials): Record<string, string> {
    try {
      if (
        encrypted.version !== 1 ||
        encrypted.algorithm !== 'aes-256-gcm'
      ) {
        throw new Error('Unsupported encryption format');
      }

      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(encrypted.iv, 'hex'),
      );

      decipher.setAuthTag(
        Buffer.from(encrypted.authTag, 'hex'),
      );

      const plaintext = Buffer.concat([
        decipher.update(
          Buffer.from(encrypted.ciphertext, 'hex'),
        ),
        decipher.final(),
      ]).toString('utf8');

      return JSON.parse(plaintext) as Record<string, string>;
    } catch {
      throw new InternalServerErrorException(
        'Unable to decrypt provider credentials',
      );
    }
  }
}
