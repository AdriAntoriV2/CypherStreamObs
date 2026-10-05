import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { QueueModule } from './queue/queue.module.js';
import { EventsModule } from './events/events.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    QueueModule,
    HealthModule,
    EventsModule,
  ],
})
export class AppModule {}