import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandRouter } from '../commands/command-router.service.js';
import {
  ChatCommandContext,
  ChatCommandHandler,
} from '../commands/types/chat-command.types.js';
import { PointPoolCommandCooldownService } from './point-pool-command-cooldown.service.js';
import { PointAddHandler } from './handlers/point-add.handler.js';
import { PointEndHandler } from './handlers/point-end.handler.js';
import { PointGoalHandler } from './handlers/point-goal.handler.js';
import { PointRankHandler } from './handlers/point-rank.handler.js';
import { PointRemoveHandler } from './handlers/point-remove.handler.js';
import { PointStartHandler } from './handlers/point-start.handler.js';

@Injectable()
export class PointPoolCommandRegistration implements OnModuleInit {
  private readonly logger = new Logger(PointPoolCommandRegistration.name);

  constructor(
    private readonly router: CommandRouter,
    private readonly cooldown: PointPoolCommandCooldownService,
    private readonly pointStartHandler: PointStartHandler,
    private readonly pointEndHandler: PointEndHandler,
    private readonly pointRankHandler: PointRankHandler,
    private readonly pointGoalHandler: PointGoalHandler,
    private readonly pointAddHandler: PointAddHandler,
    private readonly pointRemoveHandler: PointRemoveHandler,
  ) {}

  private registerWithCooldown(handler: ChatCommandHandler): void {
    const cooldown = this.cooldown;

    this.router.register({
      command: handler.command,

      async execute(context: ChatCommandContext): Promise<unknown> {
        if (!cooldown.tryAcquire(context.user.id, handler.command)) {
          return null;
        }

        return handler.execute(context);
      },
    });
  }

  onModuleInit(): void {
    const handlers: ChatCommandHandler[] = [
      this.pointStartHandler,
      this.pointEndHandler,
      this.pointRankHandler,
      this.pointGoalHandler,
      this.pointAddHandler,
      this.pointRemoveHandler,
    ];

    for (const handler of handlers) {
      this.registerWithCooldown(handler);
    }

    this.logger.log(
      `Registered ${handlers.length} Point Pool commands with a 30-second per-user cooldown`,
    );
  }
}