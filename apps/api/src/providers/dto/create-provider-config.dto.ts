import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  MessagingChannel,
  ProviderStatus,
} from '@prisma/client';

export enum ProviderName {
  META = 'META',
  MSG91 = 'MSG91',
  TWILIO = 'TWILIO',
  AWS_SES = 'AWS_SES',
  SENDGRID = 'SENDGRID',
}

export class CreateProviderConfigDto {
  @IsEnum(MessagingChannel)
  channel: MessagingChannel;

  @IsEnum(ProviderName)
  provider: ProviderName;

  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;

  @IsObject()
  credentials: Record<string, string>;

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