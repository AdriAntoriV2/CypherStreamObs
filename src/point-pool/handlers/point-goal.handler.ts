import { Injectable } from '@nestjs/common';
import { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { PointPoolService } from '../point-pool.service.js';
import { PointPoolChatPermissionService } from '../point-pool-chat-permission.service.js';

@Injectable()
export class PointGoalHandler implements ChatCommandHandler {
  readonly command = 'pointgoal';

  constructor(
    private readonly pointPool: PointPoolService,
    private readonly permissions: PointPoolChatPermissionService,
  ) {}

  async execute(context: ChatCommandContext) {
    const subcommand = context.args[0]?.toLowerCase();

    if (subcommand === 'add') {
      if (!this.permissions.isAdmin(context)) {
        return { message: 'Only the channel admin can manage goals.' };
      }

      const target = context.args[1];
      const description = context.args.slice(2).join(' ').trim();
      const targetPoints = Number(target);

      if (
        !target ||
        !Number.isSafeInteger(targetPoints) ||
        targetPoints <= 0 ||
        !description
      ) {
        return {
          message: 'Usage: !pointgoal add <points> <description>',
        };
      }

      try {
        const goal = await this.pointPool.addGoal(targetPoints, description);
        return {
          message: `Goal added: ${goal.description} (${goal.targetPoints.toLocaleString('en-US')} points, ID ${goal.id.slice(0, 6)}).`,
        };
      } catch (error) {
        return {
          message: error instanceof Error
            ? error.message
            : 'Unable to add the goal.',
        };
      }
    }

    if (subcommand === 'remove') {
      if (!this.permissions.isAdmin(context)) {
        return { message: 'Only the channel admin can manage goals.' };
      }

      const idPrefix = context.args[1];

      if (!idPrefix || context.args.length !== 2) {
        return { message: 'Usage: !pointgoal remove <id>' };
      }

      try {
        const goal = await this.pointPool.removeGoal(idPrefix);
        return { message: `Removed goal: ${goal.description}` };
      } catch (error) {
        return {
          message: error instanceof Error
            ? error.message
            : 'Unable to remove the goal.',
        };
      }
    }

    if (subcommand) {
      return {
        message: 'Usage: !pointgoal | !pointgoal add <points> <description> | !pointgoal remove <id>',
      };
    }

    try {
      const { pool, totalPoints, goals } =
        await this.pointPool.getActiveGoals();

      if (goals.length === 0) {
        return {
          message: `${pool.name}: ${totalPoints.toLocaleString('en-US')} points. No goals set yet.`,
        };
      }

      const goalSummary = goals.map((goal) => {
        const target = goal.targetPoints;
        const percent = Math.min(
          100,
          Math.floor((totalPoints / target) * 100),
        );
        const status = totalPoints >= target ? 'REACHED' : `${percent}%`;

        return `${goal.description}: ${totalPoints.toLocaleString('en-US')}/${target.toLocaleString('en-US')} (${status})`;
      });

      return {
        message: `${pool.name} — ${goalSummary.join(' | ')}`,
      };
    } catch (error) {
      return {
        message: error instanceof Error
          ? error.message
          : 'Unable to retrieve point goals.',
      };
    }
  }
}