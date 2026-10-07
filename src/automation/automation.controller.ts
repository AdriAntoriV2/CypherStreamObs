import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateRuleDto } from './dto/create-rule.dto.js';
import { AutomationService } from './automation.service.js';
import { AutomationExecutionService } from './automation-execution.service.js';
import { ListExecutionsDto } from './dto/list-executions.dto.js';

@Controller('automation/rules')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly automationExecutionService: AutomationExecutionService,
  ) { }

  @Post()
  createRule(@Body() dto: CreateRuleDto) {
    return this.automationService.createRule(dto);
  }

  @Get()
  findAllRules() {
    return this.automationService.findAllRules();
  }

  @Get(':id')
  findRule(@Param('id') id: string) {
    return this.automationService.findRule(id);
  }

  @Get('executions')
  findExecutions(
    @Query() query: ListExecutionsDto,
  ) {
    return this.automationExecutionService.findAll(
      query.page,
      query.limit,
      query.status,
      query.ruleId,
      query.eventId,
      query.from,
      query.to,
    );
  }
}