import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatOverlayService } from './chat-overlay.service.js';

describe('ChatOverlayService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a bounded list of recent messages in memory', async () => {
    const config = new ConfigService({
      chatOverlay: {
        maxMessages: 2,
        messageTtlSeconds: 60,
      },
    });
    const service = new ChatOverlayService(config);

    await service.addMessage(
      { message: { message_id: 'first', text: 'First' } },
      'fallback-first',
    );
    await service.addMessage(
      { message: { message_id: 'second', text: 'Second' } },
      'fallback-second',
    );
    await service.addMessage(
      { message: { message_id: 'third', text: 'Third' } },
      'fallback-third',
    );

    await expect(service.getRecentMessages()).resolves.toMatchObject([
      { id: 'third', text: 'Third' },
      { id: 'second', text: 'Second' },
    ]);
  });

  it('expires the in-memory message list after its TTL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const config = new ConfigService({
      chatOverlay: {
        maxMessages: 2,
        messageTtlSeconds: 1,
      },
    });
    const service = new ChatOverlayService(config);

    await service.addMessage(
      { message: { message_id: 'message', text: 'Hello' } },
      'fallback',
    );
    vi.advanceTimersByTime(1_000);

    await expect(service.getRecentMessages()).resolves.toEqual([]);
  });
});
