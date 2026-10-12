import { Injectable } from '@nestjs/common';
import { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { PointPoolService } from '../point-pool.service.js';
import { PointPoolChatPermissionService } from '../point-pool-chat-permission.service.js';

@Injectable()
export class PointStartHandler implements ChatCommandHandler {
  readonly command = 'pointstart';

  constructor(
    private readonly pointPool: PointPoolService,
    private readonly permissions: PointPoolChatPermissionService,
  ) {}

  async execute(context: ChatCommandContext) {
    if (!this.permissions.isAdmin(context)) {
      return { message: 'Only the channel admin can use this command.' };
    }

    const name = context.args[0];

    if (!name || context.args.length !== 1) {
      return { message: 'Usage: !pointstart <name>' };
    }

    try {
      const pool = await this.pointPool.startByName(name);
      return { message: `Point pool "${pool.name}" is now active!` };
    } catch (error) {
      return {
        message: error instanceof Error
          ? error.message
          : 'Unable to start the point pool.',
      };
    }
  }
}