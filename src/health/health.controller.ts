import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Check StreamOps health',
    description:
      'Checks the health of the StreamOps service and its database dependency.',
  })
  @ApiOkResponse({
    description: 'Health status returned successfully.',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ok', 'degraded'],
          example: 'ok',
          description:
            'Overall service status. `degraded` indicates that the database dependency is unavailable.',
        },
        service: {
          type: 'string',
          example: 'streamops',
        },
        dependencies: {
          type: 'object',
          properties: {
            database: {
              type: 'boolean',
              example: true,
              description: 'Whether the database is reachable.',
            },
          },
        },
      },
    },
  })
  async check() {
    const database = await this.healthService.checkDatabase();

    return {
      status: database ? 'ok' : 'degraded',
      service: 'streamops',
      dependencies: {
        database,
      },
    };
  }
}