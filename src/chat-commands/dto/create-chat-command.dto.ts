
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChatCommandDto {
  @ApiProperty({
    description: 'Command name without the ! prefix.',
    example: 'discord',
    minLength: 1,
    maxLength: 25,
    pattern: '^[a-zA-Z0-9_]+$',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Command name may contain only letters, numbers, and underscores',
  })
  @MinLength(1)
  @MaxLength(25)
  name!: string;

  @ApiProperty({
    description: 'Message returned when the command is executed.',
    example: 'Join Cypher SEKAI: https://discord.gg/example',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  response!: string;

  @ApiProperty({
    description: 'Cooldown in seconds between executions per user.',
    example: 5,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  cooldownSeconds = 0;
}
