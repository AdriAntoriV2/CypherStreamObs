import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateRuleDto } from './dto/create-rule.dto.js';
import { AutomationService } from './automation.service.js';
import { AutomationExecutionService } from './automation-execution.service.js';
import { ListExecutionsDto } from './dto/list-executions.dto.js';
import { WebhookActionDto } from './dto/actions/webhook-action.dto.js';
import { MixItUpActionDto } from './dto/actions/mixitup-action.dto.js';
import { AutomationExecutionResponseDto } from './dto/automation-execution-response.dto.js';

@ApiTags('Automation')
@ApiExtraModels(WebhookActionDto, MixItUpActionDto)
@Controller('automation/rules')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly automationExecutionService: AutomationExecutionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an automation rule' })
  @ApiBody({
    type: CreateRuleDto,
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateRuleDto) },
        {
          properties: {
            actions: {
              type: 'array',
              items: {
                oneOf: [
                  { $ref: getSchemaPath(WebhookActionDto) },
                  { $ref: getSchemaPath(MixItUpActionDto) },
                ],
                discriminator: {
                  propertyName: 'type',
                  mapping: {
                    webhook: getSchemaPath(WebhookActionDto),
                    mixitup: getSchemaPath(MixItUpActionDto),
                  },
                },
              },
            },
          },
        },
      ],
    },
  })
  @ApiCreatedResponse({ description: 'Automation rule created.' })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  createRule(@Body() dto: CreateRuleDto) {
    return this.automationService.createRule(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List automation rules' })
  @ApiOkResponse({ description: 'Automation rules retrieved successfully.' })
  findAllRules() {
    return this.automationService.findAllRules();
  }

  @Get('executions')
  @ApiOperation({ summary: 'List automation execution history' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number, starting at 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Results per page, from 1 to 100.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['RUNNING', 'COMPLETED', 'FAILED'],
  })
  @ApiQuery({
    name: 'ruleId',
    required: false,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'eventId',
    required: false,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    format: 'date-time',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    format: 'date-time',
  })
  @ApiOkResponse({
    description: 'Paginated automation execution history.',
    type: AutomationExecutionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  findExecutions(@Query() query: ListExecutionsDto) {
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

  @Get(':id')
  @ApiOperation({ summary: 'Get an automation rule by ID' })
  @ApiOkResponse({ description: 'Automation rule retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Automation rule not found.' })
  findRule(@Param('id') id: string) {
    return this.automationService.findRule(id);
  }
}