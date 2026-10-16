import { Injectable } from '@nestjs/common';
import type {
  ChatCommandContext,
  ChatCommandHandler,
} from '../../commands/types/chat-command.types.js';
import { SongRequestService } from '../song-request.service.js';

@Injectable()
export class QueueHandler implements ChatCommandHandler {
  readonly command = 'queue';

  constructor(
    private readonly songRequests: SongRequestService,
  ) {}

  async execute(_context: ChatCommandContext) {
    const queue = await this.songRequests.getQueue();
    const lines: string[] = [];

    if (queue.current) {
      const title =
        queue.current.track?.title ?? queue.current.query;

      lines.push(`Now playing: ${title}`);
    }

    if (queue.pending.length === 0) {
      lines.push('No pending song requests.');
    } else {
      const maxDisplayed = 5;

      const requests = queue.pending
        .slice(0, maxDisplayed)
        .map((request, index) => {
          const title =
            request.track?.title ?? request.query;

          return `${index + 1}. ${title} (${request.requester.displayName})`;
        });

      lines.push(`Up next (${queue.pending.length}):`);
      lines.push(...requests);

      const remaining =
        queue.pending.length - requests.length;

      if (remaining > 0) {
        lines.push(`and ${remaining} more`);
      }
    }

    return {
      ok: true,
      message: lines.join(' | '),
    };
  }
}