import { afterEach, describe, expect, it, vi } from 'vitest';
import { TwitchOAuthStateService } from './twitch-oauth-state.service.js';

describe('TwitchOAuthStateService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows an OAuth state to be consumed only once', async () => {
    const service = new TwitchOAuthStateService();
    const state = await service.create();

    await expect(service.consume(state)).resolves.toBe(true);
    await expect(service.consume(state)).resolves.toBe(false);
  });

  it('rejects expired OAuth states', async () => {
    vi.useFakeTimers();
    const service = new TwitchOAuthStateService();
    const state = await service.create();

    vi.advanceTimersByTime(5 * 60 * 1_000);

    await expect(service.consume(state)).resolves.toBe(false);
  });
});
