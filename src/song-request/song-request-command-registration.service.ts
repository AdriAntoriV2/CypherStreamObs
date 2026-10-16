
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandRouter } from '../commands/command-router.service.js';
import { QueueHandler } from './handlers/queue.handler.js';
import { SkipHandler } from './handlers/skip.handler.js';
import { SongRequestHandler } from './handlers/song-request.handler.js';
import { RadioHandler } from './handlers/radio.handler.js';

@Injectable()
export class SongRequestCommandRegistration
  implements OnModuleInit {
  constructor(
    private readonly router: CommandRouter,
    private readonly songRequestHandler: SongRequestHandler,
    private readonly queueHandler: QueueHandler,
    private readonly skipHandler: SkipHandler,
    private readonly radioHandler: RadioHandler,
  ) { }

  onModuleInit(): void {
    this.router.register(this.songRequestHandler);
    this.router.register(this.queueHandler);
    this.router.register(this.skipHandler);
    this.router.register(this.radioHandler);
  }
}
