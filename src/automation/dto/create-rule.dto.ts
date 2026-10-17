import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { MixItUpActionDto } from './actions/mixitup-action.dto.js';
import { WebhookActionDto } from './actions/webhook-action.dto.js';
import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

export class CreateRuleDto {
  @ApiProperty({ example: 'Welcome New Followers' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ example: 'channel.follow' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, unknown>;

  @ApiProperty({
    type: 'array',
    description: 'Actions to execute. Each action must have a supported type.',
    items: {
      oneOf: [
        { $ref: getSchemaPath(WebhookActionDto) },
        { $ref: getSchemaPath(MixItUpActionDto) },
      ],
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { name: 'webhook', value: WebhookActionDto },
        { name: 'mixitup', value: MixItUpActionDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  actions: (WebhookActionDto | MixItUpActionDto)[];

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}