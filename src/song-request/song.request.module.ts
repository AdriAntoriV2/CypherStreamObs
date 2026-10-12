
import { Module } from '@nestjs/common';
import { CommandsModule } from '../commands/commands.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { QueueHandler } from './handlers/queue.handler.js';
import { SkipHandler } from './handlers/skip.handler.js';
import { SongRequestHandler } from './handlers/song-request.handler.js';
import { SongRequestCommandRegistration } from './song.request-command-registration.service.js';
import { SongRequestRepository } from './song.request.repository.js';
import { SongRequestService } from './song.request.service.js';

@Module({
  imports: [CommandsModule, QueueModule],
  providers: [
    SongRequestRepository,
    SongRequestService,
    SongRequestHandler,
    QueueHandler,
    SkipHandler,
    SongRequestCommandRegistration,
  ],
  exports: [SongRequestService],
})
export class SongRequestModule {}
