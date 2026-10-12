import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatCommandsService } from './chat-commands.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ChatCommandContext } from '../commands/types/chat-command.types.js';

describe('ChatCommandsService custom command execution', () => {
  const findUnique = vi.fn();

  const prisma = {
    chatCommand: {
      findUnique,
    },
  };

  let service: ChatCommandsService;

  const context: ChatCommandContext = {
    command: 'discord',
    args: [],
    rawMessage: '!discord',
    user: {
      id: 'user-123',
      login: 'testuser',
      displayName: 'Test User',
    },
    streamId: 'stream-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatCommandsService(prisma as unknown as PrismaService);
  });

  it('returns the configured response for an enabled command', async () => {
    findUnique.mockResolvedValue({
      id: 'command-123',
      name: 'discord',
      response: 'Join my Discord!',
      enabled: true,
      cooldownSeconds: 0,
    });

    await expect(service.executeCustom(context)).resolves.toEqual({
      message: 'Join my Discord!',
    });
  });

  it('ignores missing commands', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.executeCustom(context)).resolves.toBeNull();
  });

  it('ignores disabled commands', async () => {
    findUnique.mockResolvedValue({
      id: 'command-123',
      name: 'discord',
      response: 'Join my Discord!',
      enabled: false,
      cooldownSeconds: 0,
    });

    await expect(service.executeCustom(context)).resolves.toBeNull();
  });

  it('enforces cooldown separately for each user', async () => {
    findUnique.mockResolvedValue({
      id: 'command-123',
      name: 'discord',
      response: 'Join my Discord!',
      enabled: true,
      cooldownSeconds: 30,
    });

    await expect(service.executeCustom(context)).resolves.toEqual({
      message: 'Join my Discord!',
    });

    await expect(service.executeCustom(context)).resolves.toBeNull();

    await expect(
      service.executeCustom({
        ...context,
        user: { ...context.user, id: 'user-456' },
      }),
    ).resolves.toEqual({
      message: 'Join my Discord!',
    });
  });
});