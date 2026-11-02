import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessagingChannel } from '@prisma/client';

export class CampaignChannelDto {
  @IsEnum(MessagingChannel)
  channel: MessagingChannel;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;
}

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CampaignChannelDto)
  channels: CampaignChannelDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds?: string[];

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}