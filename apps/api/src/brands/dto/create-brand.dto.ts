
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @MaxLength(2048)
  logoUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownerName: string;

  @IsEmail()
  @MaxLength(255)
  ownerEmail: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  temporaryPassword: string;
}
