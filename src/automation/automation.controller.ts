import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateRuleDto } from './dto/create-rule.dto.js';
import { AutomationService } from './automation.service.js';

@Controller('automation/rules')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
  ) {}

  @Post()
  createRule(@Body() dto: CreateRuleDto) {
    return this.automationService.createRule(dto);
  }

  @Get()
  findAllRules() {
    return this.automationService.findAllRules();
  }
}