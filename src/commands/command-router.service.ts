import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  ChatCommandContext,
  ChatCommandHandler,
} from './types/chat-command.types.js';

@Injectable()
export class CommandRouter {
  private readonly logger =
    new Logger(CommandRouter.name);

  private readonly handlers =
    new Map<string, ChatCommandHandler>();

  register(
    handler: ChatCommandHandler,
  ) {
    if (
      this.handlers.has(handler.command)
    ) {
      throw new Error(
        `Command "${handler.command}" is already registered`,
      );
    }

    this.handlers.set(
      handler.command,
      handler,
    );
  }

  async execute(
    context: ChatCommandContext,
  ) {
    const handler =
      this.handlers.get(context.command);

    if (!handler) {
      return null;
    }

    this.logger.debug(
      `Executing chat command: ${context.command}`,
    );

    return handler.execute(context);
  }
}