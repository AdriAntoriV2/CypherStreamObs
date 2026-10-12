import { Injectable } from '@nestjs/common';
import { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { PointPoolService } from '../point-pool.service.js';

@Injectable()
export class PointRankHandler implements ChatCommandHandler {
  readonly command = 'pointrank';

  constructor(private readonly pointPool: PointPoolService) {}

  async execute(_context: ChatCommandContext) {
    try {
      const rankings = await this.pointPool.getActiveRank();

      if (rankings.length === 0) {
        return { message: 'No point redemptions yet for this pool.' };
      }

      const message = rankings
        .map(
          (entry) =>
            `${entry.rank}. ${entry.displayName}: ${entry.points.toLocaleString('en-US')}`,
        )
        .join(' | ');

      return { message: `Point Pool Top 3: ${message}` };
    } catch (error) {
      return {
        message: error instanceof Error
          ? error.message
          : 'Unable to retrieve the point ranking.',
      };
    }
  }
}