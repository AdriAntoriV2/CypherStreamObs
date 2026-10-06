import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AutomationAction } from '../types/action.types.js';

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
  actions: AutomationAction[];
  
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}