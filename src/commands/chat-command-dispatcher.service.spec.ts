import { describe, expect, it, vi } from 'vitest';
import { ChatCommandDispatcher } from './chat-command-dispatcher.service.js';
import { ChatCommandParser } from './chat-command-parser.service.js';
import { CommandRouter } from './command-router.service.js';

describe('ChatCommandDispatcher', () => {
  it('dispatches a parsed command with the Twitch user and stream context', async () => {
    const parser = new ChatCommandParser();
    const router = new CommandRouter();
    const chatCommands = {
      executeCustom: vi.fn().mockResolvedValue(null),
    };

    const execute = vi.fn().mockResolvedValue({
      message: 'Pong!',
    });

    router.register({
      command: 'ping',
      execute,
    });

    const dispatcher = new ChatCommandDispatcher(
      parser,
      router,
      chatCommands as never,
    );

    await expect(
      dispatcher.dispatch(
        {
          message: { text: '!ping hello world' },
          chatter_user_id: 'user-123',
          chatter_user_login: 'testuser',
          chatter_user_name: 'Test User',
        },
        'stream-123',
      ),
    ).resolves.toBe('Pong!');

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

    expect(chatCommands.executeCustom).not.toHaveBeenCalled();
  });

  it('falls back to a custom command when no built-in handler matches', async () => {
    const chatCommands = {
      executeCustom: vi.fn().mockResolvedValue({
        message: 'Join my Discord!',
      }),
    };

    const dispatcher = new ChatCommandDispatcher(
      new ChatCommandParser(),
      new CommandRouter(),
      chatCommands as never,
    );

    await expect(
      dispatcher.dispatch(
        {
          message: { text: '!discord' },
          chatter_user_id: 'user-123',
          chatter_user_login: 'testuser',
          chatter_user_name: 'Test User',
        },
        'stream-123',
      ),
    ).resolves.toBe('Join my Discord!');

    expect(chatCommands.executeCustom).toHaveBeenCalledWith({
      command: 'discord',
      args: [],
      rawMessage: '!discord',
      user: {
        id: 'user-123',
        login: 'testuser',
        displayName: 'Test User',
      },
      streamId: 'stream-123',
    });
  });

  it('does not execute handlers for ordinary messages', async () => {
    const execute = vi.fn().mockResolvedValue(null);
    const chatCommands = {
      executeCustom: vi.fn().mockResolvedValue(null),
    };

    const router = new CommandRouter();
    router.register({
      command: 'ping',
      execute,
    });

    const dispatcher = new ChatCommandDispatcher(
      new ChatCommandParser(),
      router,
      chatCommands as never,
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
    expect(chatCommands.executeCustom).not.toHaveBeenCalled();
  });

  it('ignores malformed chat payloads', async () => {
    const chatCommands = {
      executeCustom: vi.fn().mockResolvedValue(null),
    };

    const dispatcher = new ChatCommandDispatcher(
      new ChatCommandParser(),
      new CommandRouter(),
      chatCommands as never,
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

    expect(chatCommands.executeCustom).not.toHaveBeenCalled();
  });
});