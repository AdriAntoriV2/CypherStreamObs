
import { Injectable, Logger } from '@nestjs/common';
import { ChatCommandParser } from './chat-command-parser.service.js';
import { CommandRouter } from './command-router.service.js';
import { ChatCommandsService } from '../chat-commands/chat-commands.service.js';
import { ChatCommandContext } from './types/chat-command.types.js';

interface TwitchChatMessagePayload {
  message?: {
    text?: unknown;
  };
  chatter_user_id?: unknown;
  chatter_user_login?: unknown;
  chatter_user_name?: unknown;
}

@Injectable()
export class ChatCommandDispatcher {
  private readonly logger = new Logger(
    ChatCommandDispatcher.name,
  );

  constructor(
    private readonly parser: ChatCommandParser,
    private readonly router: CommandRouter,
    private readonly chatCommands: ChatCommandsService,
  ) { }

  async dispatch(
    payload: TwitchChatMessagePayload,
    streamId: string,
  ): Promise<string | null> {
    const rawMessage = payload.message?.text;

    const userId = payload.chatter_user_id;
    const login = payload.chatter_user_login;
    const displayName = payload.chatter_user_name;

    if (
      typeof rawMessage !== 'string' ||
      typeof userId !== 'string' ||
      typeof login !== 'string' ||
      typeof displayName !== 'string'
    ) {
      this.logger.warn(
        'Ignoring malformed Twitch chat message',
      );
      return null;;
    }

    const parsed = this.parser.parse(rawMessage);

    if (!parsed) {
      return null;;
    }

    const context: ChatCommandContext = {
      command: parsed.command,
      args: parsed.args,
      rawMessage,
      user: {
        id: userId,
        login,
        displayName,
      },
      streamId,
    };

    let result: unknown = await this.router.execute(context);

    if (result === null) {
      result = await this.chatCommands.executeCustom(context);
    }

    if (
      result !== null &&
      typeof result === 'object' &&
      'message' in result &&
      typeof result.message === 'string' &&
      result.message.length > 0
    ) {
      return result.message;
    }

    return null;
  }
}
