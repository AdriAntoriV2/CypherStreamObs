import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
  actions: Record<string, unknown>[];

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}