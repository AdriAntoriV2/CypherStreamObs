import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { CommandRouter } from './command-router.service.js';
import type {
  ChatCommandContext,
  ChatCommandHandler,
} from './types/chat-command.types.js';

describe('CommandRouter', () => {
  it('executes a registered command', async () => {
    const router =
      new CommandRouter();

    const execute =
      vi.fn().mockResolvedValue({
        success: true,
      });

    const handler:
      ChatCommandHandler = {
        command: 'sr',
        execute,
      };

    router.register(handler);

    const context:
      ChatCommandContext = {
        command: 'sr',
        args: ['test'],
        rawMessage: '!sr test',
        user: {
          id: 'user-1',
          login: 'testuser',
          displayName: 'TestUser',
        },
        streamId: 'stream-1',
      };

    const result =
      await router.execute(context);

    expect(result).toEqual({
      success: true,
    });

    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(
      context,
    );
  });

  it('returns null for an unknown command', async () => {
    const router =
      new CommandRouter();

    const context:
      ChatCommandContext = {
        command: 'unknown',
        args: [],
        rawMessage: '!unknown',
        user: {
          id: 'user-1',
          login: 'testuser',
          displayName: 'TestUser',
        },
        streamId: 'stream-1',
      };

    await expect(
      router.execute(context),
    ).resolves.toBeNull();
  });

  it('rejects duplicate command registration', () => {
    const router =
      new CommandRouter();

    const handler:
      ChatCommandHandler = {
        command: 'sr',
        execute: vi.fn(),
      };

    router.register(handler);

    expect(() =>
      router.register(handler),
    ).toThrow(
      'Command "sr" is already registered',
    );
  });

  it('supports multiple commands', async () => {
    const router =
      new CommandRouter();

    const srExecute =
      vi.fn().mockResolvedValue('sr');

    const queueExecute =
      vi.fn().mockResolvedValue('queue');

    router.register({
      command: 'sr',
      execute: srExecute,
    });

    router.register({
      command: 'queue',
      execute: queueExecute,
    });

    const baseContext = {
      args: [],
      rawMessage: '',
      user: {
        id: 'user-1',
        login: 'testuser',
        displayName: 'TestUser',
      },
      streamId: 'stream-1',
    };

    await expect(
      router.execute({
        ...baseContext,
        command: 'sr',
      }),
    ).resolves.toBe('sr');

    await expect(
      router.execute({
        ...baseContext,
        command: 'queue',
      }),
    ).resolves.toBe('queue');

    expect(srExecute).toHaveBeenCalledOnce();
    expect(queueExecute).toHaveBeenCalledOnce();
  });
});