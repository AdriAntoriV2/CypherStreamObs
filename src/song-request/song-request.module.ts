
import { Module } from '@nestjs/common';
import { CommandsModule } from '../commands/commands.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { TwitchModule } from '../twitch/twitch.module.js';
import { ChatCommandAdminGuard } from '../chat-commands/chat-command-admin.guard.js';
import { QueueHandler } from './handlers/queue.handler.js';
import { SkipHandler } from './handlers/skip.handler.js';
import { SongRequestHandler } from './handlers/song-request.handler.js';
import { SongRequestCommandRegistration } from './song-request-command-registration.service.js';
import { SongRequestRepository } from './song-request.repository.js';
import { YouTubeResolverService } from './youtube-resolver.service.js';
import { SongRequestService } from './song-request.service.js';
import { SongResolutionProcessor } from './song-resolution.processor.js';
import { MpvPlaybackEngine } from './mpv-playback.engine.js';
import { PLAYBACK_ENGINE } from './playback-engine.js';
import { PlaybackControllerService } from './playback-controller.service.js';
import { RadioHandler } from './handlers/radio.handler.js';
import { SongRequestController } from './song-request.controller.js';

@Module({
  imports: [
    CommandsModule,
    QueueModule,
    TwitchModule,
  ],
  controllers: [SongRequestController],
  providers: [
    ChatCommandAdminGuard,
    SongRequestRepository,
    SongRequestService,
    SongRequestHandler,
    QueueHandler,
    SkipHandler,
    SongRequestCommandRegistration,
    YouTubeResolverService,
    SongResolutionProcessor,
    MpvPlaybackEngine,
    RadioHandler,
    PlaybackControllerService,
    {
      provide: PLAYBACK_ENGINE,
      useExisting: MpvPlaybackEngine,
    },
  ],
  exports: [SongRequestService],
})
export class SongRequestModule {}
