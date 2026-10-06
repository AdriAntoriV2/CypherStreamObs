import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class WebhookActionDto {
  @IsString()
  @IsIn(['webhook'])
  type: 'webhook';

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}