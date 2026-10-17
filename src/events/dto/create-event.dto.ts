
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'ID of the stream associated with this event.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  streamId: string;

  @ApiProperty({
    description: 'Event type used by downstream event handlers.',
    example: 'channel.follow',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Event-specific payload.',
    type: 'object',
    additionalProperties: true,
    example: {
      userId: '123456789',
      username: 'viewer123',
    },
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'External event identifier, used to prevent duplicate events.',
    example: 'twitch-event-123',
  })
  @IsOptional()
  @IsString()
  externalId?: string;
}
