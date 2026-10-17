import { ApiProperty } from '@nestjs/swagger';
import { AutomationExecutionItemResponseDto } from './automation-execution-item-response.dto.js';

export class AutomationExecutionMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class AutomationExecutionResponseDto {
  @ApiProperty({ type: AutomationExecutionItemResponseDto, isArray: true })
  data: AutomationExecutionItemResponseDto[];

  @ApiProperty({ type: AutomationExecutionMetaDto })
  meta: AutomationExecutionMetaDto;
}