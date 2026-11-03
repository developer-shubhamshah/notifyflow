import {
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  NotEquals,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @NotEquals('', { message: 'New password cannot be empty' })
  newPassword: string;
}