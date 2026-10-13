import { Module } from '@nestjs/common';
import { TwitchController } from './twitch.controller.js';
import { TwitchService } from './twitch.service.js';
import { TwitchApiClient } from './twitch-api.client.js';
import { TwitchEventSubService } from './twitch-eventsub.service.js';
import { TwitchAuthenticatedClient } from './twitch-authenticated.client.js';
import { TwitchEventNormalizer } from './twitch-event-normalizer.service.js';
import { StreamsModule } from '../streams/streams.module.js';
import { EventsModule } from '../events/events.module.js';
import { TwitchEventIngestionService } from './twitch-event-ingestion.service.js';
import { CommandsModule } from '../commands/commands.module.js';
import { SecurityModule } from '../common/security/security.module.js';
import { TwitchOAuthStateService } from './twitch-oauth-state.service.js';
import { QueueModule } from '../queue/queue.module.js';
import { PointPoolModule } from '../point-pool/point-pool.module.js';
import { FirstOverlayModule } from '../first-overlay/first-overlay.module.js';

@Module({
  controllers: [
    TwitchController,
  ],
  providers: [
    TwitchService,
    TwitchApiClient,
    TwitchEventSubService,
    TwitchAuthenticatedClient,
    TwitchEventNormalizer,
    TwitchEventIngestionService,
    TwitchOAuthStateService,
  ],
  imports: [
    EventsModule,
    StreamsModule,
    CommandsModule,
    SecurityModule,
    QueueModule,
    PointPoolModule,
    FirstOverlayModule,
  ],
  exports: [
    TwitchService,
  ],
})
export class TwitchModule { }