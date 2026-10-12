
import { Injectable } from '@nestjs/common';
import { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { SongRequestService } from '../song-request.service.js';

@Injectable()
export class QueueHandler implements ChatCommandHandler {
  readonly command = 'queue';

  constructor(
    private readonly songRequests: SongRequestService,
  ) {}

  async execute(_context: ChatCommandContext) {
    return {
      ok: true,
      queue: await this.songRequests.getQueue(),
    };
  }
}
