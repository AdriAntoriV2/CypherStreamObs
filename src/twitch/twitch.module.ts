import { Module } from '@nestjs/common';
import { TwitchController } from './twitch.controller.js';
import { TwitchService } from './twitch.service.js';
import { TwitchApiClient } from './twitch-api.client.js';
import { TwitchEventSubService } from './twitch-eventsub.service.js';

@Module({
  controllers: [
    TwitchController,
  ],
  providers: [
    TwitchService,
    TwitchApiClient,
    TwitchEventSubService,
  ],
  exports: [
    TwitchService,
  ],
})
export class TwitchModule {}