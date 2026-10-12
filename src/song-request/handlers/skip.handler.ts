
import { Injectable } from '@nestjs/common';
import { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { SongRequestService } from '../song-request.service.js';

@Injectable()
export class SkipHandler implements ChatCommandHandler {
  readonly command = 'skip';

  constructor(
    private readonly songRequests: SongRequestService,
  ) {}

  async execute(_context: ChatCommandContext) {
    const skipped = await this.songRequests.skipCurrent();

    if (!skipped) {
      return {
        ok: false,
        message: 'There is no active track to skip.',
      };
    }

    return {
      ok: true,
      message: 'Current track removed.',
    };
  }
}
