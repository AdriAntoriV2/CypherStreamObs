import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutomationRuleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Welcome New Followers' })
  name: string;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: 'channel.follow' })
  eventType: string;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  conditions: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Configured actions for this rule.',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  actions: Record<string, unknown>[];

  @ApiProperty({ example: 0 })
  priority: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}