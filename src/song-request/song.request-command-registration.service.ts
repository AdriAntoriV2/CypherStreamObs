
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandRouter } from '../commands/command-router.service.js';
import { QueueHandler } from './handlers/queue.handler.js';
import { SkipHandler } from './handlers/skip.handler.js';
import { SongRequestHandler } from './handlers/song-request.handler.js';

@Injectable()
export class SongRequestCommandRegistration
  implements OnModuleInit
{
  constructor(
    private readonly router: CommandRouter,
    private readonly songRequestHandler: SongRequestHandler,
    private readonly queueHandler: QueueHandler,
    private readonly skipHandler: SkipHandler,
  ) {}

  onModuleInit(): void {
    this.router.register(this.songRequestHandler);
    this.router.register(this.queueHandler);
    this.router.register(this.skipHandler);
  }
}
