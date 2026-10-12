
import { describe, expect, it, vi } from 'vitest';
import { ChatCommandDispatcher } from './chat-command-dispatcher.service.js';
import { ChatCommandParser } from './chat-command-parser.service.js';
import { CommandRouter } from './command-router.service.js';

describe('ChatCommandDispatcher', () => {
  it('dispatches a parsed command with the Twitch user and stream context', async () => {
    const parser = new ChatCommandParser();
    const router = new CommandRouter();

    const execute = vi.fn().mockResolvedValue({
      ok: true,
    });

    router.register({
      command: 'ping',
      execute,
    });

    const dispatcher = new ChatCommandDispatcher(
      parser,
      router,
    );

    await dispatcher.dispatch(
      {
        message: { text: '!ping hello world' },
        chatter_user_id: 'user-123',
        chatter_user_login: 'testuser',
        chatter_user_name: 'Test User',
      },
      'stream-123',
    );

    expect(execute).toHaveBeenCalledWith({
      command: 'ping',
      args: ['hello', 'world'],
      rawMessage: '!ping hello world',
      user: {
        id: 'user-123',
        login: 'testuser',
        displayName: 'Test User',
      },
      streamId: 'stream-123',
    });
  });

  it('does not execute handlers for ordinary messages', async () => {
    const parser = new ChatCommandParser();
    const router = new CommandRouter();
    const execute = vi.fn().mockResolvedValue(null);

    router.register({
      command: 'ping',
      execute,
    });

    const dispatcher = new ChatCommandDispatcher(
      parser,
      router,
    );

    await dispatcher.dispatch(
      {
        message: { text: 'hello everyone' },
        chatter_user_id: 'user-123',
        chatter_user_login: 'testuser',
        chatter_user_name: 'Test User',
      },
      'stream-123',
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it('ignores malformed chat payloads', async () => {
    const dispatcher = new ChatCommandDispatcher(
      new ChatCommandParser(),
      new CommandRouter(),
    );

    await expect(
      dispatcher.dispatch(
        {
          message: { text: '!ping' },
          chatter_user_id: 123,
        },
        'stream-123',
      ),
    ).resolves.toBeNull();
  });
});
