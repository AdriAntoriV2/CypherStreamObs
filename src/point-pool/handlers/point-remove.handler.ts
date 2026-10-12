import { Injectable } from '@nestjs/common';
import { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { PointPoolService } from '../point-pool.service.js';
import { PointPoolChatPermissionService } from '../point-pool-chat-permission.service.js';

@Injectable()
export class PointRemoveHandler implements ChatCommandHandler {
  readonly command = 'pointremove';

  constructor(
    private readonly pointPool: PointPoolService,
    private readonly permissions: PointPoolChatPermissionService,
  ) {}

  async execute(context: ChatCommandContext) {
    if (!this.permissions.isAdmin(context)) {
      return { message: 'Only the channel admin can use this command.' };
    }

    const rawAmount = context.args[0];
    const amount = Number(rawAmount);

    if (
      !rawAmount ||
      context.args.length !== 1 ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      return { message: 'Usage: !pointremove <positive amount>' };
    }

    try {
      const result = await this.pointPool.adjustPoints(
        -amount,
        'Manual point correction',
      );

      return {
        message: `GreedyKAITO removed ${amount.toLocaleString('en-US')} points. Pool total: ${result.totalPoints.toLocaleString('en-US')}.`,
      };
    } catch (error) {
      return {
        message: error instanceof Error
          ? error.message
          : 'Unable to remove points.',
      };
    }
  }
}