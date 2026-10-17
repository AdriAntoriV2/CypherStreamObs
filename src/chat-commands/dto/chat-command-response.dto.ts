
import { ApiProperty } from '@nestjs/swagger';

export class ChatCommandResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ example: 'discord' })
  name: string;

  @ApiProperty({
    example: 'Join Cypher SEKAI on Discord!',
  })
  response: string;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: 5, minimum: 0 })
  cooldownSeconds: number;

  @ApiProperty({
    format: 'date-time',
    example: '2026-10-17T08:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-10-17T08:00:00.000Z',
  })
  updatedAt: string;
}
