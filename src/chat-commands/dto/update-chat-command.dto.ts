
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateChatCommandDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  response?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownSeconds?: number;
}
