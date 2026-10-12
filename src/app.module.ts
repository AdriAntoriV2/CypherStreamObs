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
import { TwitchModule } from './twitch/twitch.module.js';
import { CommandsModule } from './commands/commands.module.js';
import { SongRequestModule } from './song-request/song-request.module.js';
import { ChatCommandsModule } from './chat-commands/chat-commands.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    QueueModule,
    HealthModule,
    EventsModule,
    StreamsModule,
    AutomationModule,
    TwitchModule,
    CommandsModule,
    SongRequestModule,
    ChatCommandsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('{*path}')
  }
}