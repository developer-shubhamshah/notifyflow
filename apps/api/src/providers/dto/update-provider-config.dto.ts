
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ProviderStatus } from '@prisma/client';

import { ProviderName } from './create-provider-config.dto';

export class UpdateProviderConfigDto {
  @IsOptional()
  @IsEnum(ProviderName)
  provider?: ProviderName;

  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  senderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  senderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerAccountId?: string;
}
