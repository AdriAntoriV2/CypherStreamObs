
import { Injectable, Logger } from '@nestjs/common';
import { ChatCommandParser } from './chat-command-parser.service.js';
import { CommandRouter } from './command-router.service.js';

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
  ) {}

  async dispatch(
    payload: TwitchChatMessagePayload,
    streamId: string,
  ): Promise<void> {
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
      return;
    }

    const parsed = this.parser.parse(rawMessage);

    if (!parsed) {
      return;
    }

    await this.router.execute({
      command: parsed.command,
      args: parsed.args,
      rawMessage,
      user: {
        id: userId,
        login,
        displayName,
      },
      streamId,
    });
  }
}
