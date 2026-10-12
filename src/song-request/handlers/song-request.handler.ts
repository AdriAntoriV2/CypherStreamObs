
import { Injectable } from '@nestjs/common';
import { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { SongRequestService } from '../song-request.service.js';

@Injectable()
export class SongRequestHandler implements ChatCommandHandler {
  readonly command = 'sr';

  constructor(
    private readonly songRequests: SongRequestService,
  ) { }

  async execute(context: ChatCommandContext) {
    const query = context.args.join(' ').trim();

    if (!query) {
      return {
        ok: false,
        message: 'Usage: !sr <YouTube URL or search query>',
      };
    }

    try {
      const request = await this.songRequests.addRequestAndWait({
        query,
        requester: context.user,
      });

      return {
        ok: true,
        message: `Song added: ${request.track?.title ?? query}`,
        request,
      };
    }
    catch (error) {
      return {
        ok: false,
        message: 'Unable to find or load that video.'
      };

    }
  }
}
