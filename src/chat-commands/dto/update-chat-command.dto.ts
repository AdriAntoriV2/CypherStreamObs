
import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({
    description: 'Replacement response message.',
    example: 'Join Cypher SEKAI on Discord!',
    minLength: 1,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  response?: string;

  @ApiPropertyOptional({
    description: 'Whether the command can be executed.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Updated cooldown in seconds.',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownSeconds?: number;
}
