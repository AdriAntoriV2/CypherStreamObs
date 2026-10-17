
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';
import {
    ApiCheckHealth,
    ApiHealthControllerDocs,
} from './health.swagger.js';

@ApiHealthControllerDocs()
@Controller('health')
export class HealthController {
    constructor(
        private readonly healthService: HealthService,
    ) {}

    @Get()
    @ApiCheckHealth()
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
