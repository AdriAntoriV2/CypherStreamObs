import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutomationActionExecutionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  executionId: string;

  @ApiProperty({ example: 0 })
  actionIndex: number;

  @ApiProperty({ example: 'webhook' })
  actionType: string;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Result returned by the action executor.',
  })
  result: unknown;

  @ApiPropertyOptional({ nullable: true })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  completedAt: Date | null;
}