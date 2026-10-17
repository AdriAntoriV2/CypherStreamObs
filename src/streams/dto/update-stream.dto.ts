import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateStreamDto {
  @ApiPropertyOptional({
    example: 'Project SEKAI ranked grind',
    description: 'Updated title of the stream.',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: '2026-10-17T08:00:00.000Z',
    description: 'Updated stream start time.',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional({
    example: '2026-10-17T12:30:00.000Z',
    description: 'Time when the stream ended.',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endedAt?: string;
}