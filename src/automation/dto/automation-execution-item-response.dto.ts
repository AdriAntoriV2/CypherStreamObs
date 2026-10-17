import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationRuleResponseDto } from './automation-rule-response.dto.js';
import { AutomationActionExecutionResponseDto } from './automation-action-execution-response.dto.js';

export class AutomationExecutionItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  ruleId: string;

  @ApiProperty({ format: 'uuid' })
  eventId: string;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: 1 })
  attempts: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Overall execution result.',
  })
  result: unknown;

  @ApiPropertyOptional({ nullable: true })
  lastError: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  completedAt: Date | null;

  @ApiProperty({ type: AutomationRuleResponseDto })
  rule: AutomationRuleResponseDto;

  @ApiProperty({
    type: AutomationActionExecutionResponseDto,
    isArray: true,
  })
  actions: AutomationActionExecutionResponseDto[];
}