import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TestProviderConnectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  senderId?: string;
}