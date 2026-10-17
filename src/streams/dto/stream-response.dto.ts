import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StreamResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier of the stream.',
  })
  id: string;

  @ApiProperty({
    example: 'Project SEKAI ranked grind',
    description: 'Title of the stream.',
  })
  title: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-10-17T08:00:00.000Z',
    description: 'Time when the stream started.',
  })
  startedAt: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-10-17T12:30:00.000Z',
    description: 'Time when the stream ended. Null while the stream is active.',
    nullable: true,
  })
  endedAt: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2026-10-17T08:00:01.000Z',
    description: 'Time when the stream record was created.',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-10-17T12:30:00.000Z',
    description: 'Time when the stream record was last updated.',
  })
  updatedAt: string;
}