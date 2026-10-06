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

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  eventType: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        {
          name: 'webhook',
          value: WebhookActionDto,
        },
        {
          name: 'mixitup',
          value: MixItUpActionDto,
        },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  actions: (WebhookActionDto | MixItUpActionDto)[];

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}