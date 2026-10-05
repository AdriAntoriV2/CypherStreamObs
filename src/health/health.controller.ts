import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
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
