import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';

import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { QueueModule } from './queue/queue.module.js';
import { EventsModule } from './events/events.module.js';
import { StreamsModule } from './streams/streams.module.js';
import { AutomationModule } from './automation/automation.module.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    QueueModule,
    HealthModule,
    EventsModule,
    StreamsModule,
    AutomationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*');
  }
}