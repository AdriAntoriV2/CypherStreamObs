import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateStreamDto {
  @ApiProperty({
    example: 'Project SEKAI ranked grind',
    description: 'Title of the stream.',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: '2026-10-17T08:00:00.000Z',
    description:
      'Stream start time. If omitted, the current server time is used.',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startedAt?: string;
}