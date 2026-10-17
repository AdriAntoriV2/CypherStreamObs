import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookActionDto {
  @ApiProperty({ enum: ['webhook'], example: 'webhook' })
  type: 'webhook';

  @ApiProperty({ format: 'uri', example: 'https://example.com/webhook' })
  url: string;

  @ApiPropertyOptional({
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    default: 'POST',
  })
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  body?: Record<string, unknown>;
}