
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Redis } from 'ioredis';
import { SongRequestRepository } from './song-request.repository.js';
import { SongRequest } from './song-request.types.js';

describe('SongRequestRepository', () => {
  const redis = {
    eval: vi.fn(),
    get: vi.fn(),
    lrange: vi.fn(),
    del: vi.fn(),
  };

  let repository: SongRequestRepository;

  const request: SongRequest = {
    id: 'request-1',
    query: '米津玄師 Lemon',
    requester: {
      id: 'user-1',
      login: 'viewer',
      displayName: 'Viewer',
    },
    requestedAt: new Date().toISOString(),
    status: 'resolving',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new SongRequestRepository(redis as unknown as Redis);
  });

  it('atomically enqueues a request when Redis accepts it', async () => {
    redis.eval.mockResolvedValue(1);

    await expect(repository.enqueue(request, 10)).resolves.toBe(true);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'streamops:song-request:v1:pending',
      JSON.stringify(request),
      '10',
    );
  });

  it('reports a full queue when Redis rejects an enqueue', async () => {
    redis.eval.mockResolvedValue(0);

    await expect(repository.enqueue(request, 10)).resolves.toBe(false);
  });

  it('returns the current track and ordered pending requests', async () => {
    redis.get.mockResolvedValue(null);
    redis.lrange.mockResolvedValue([JSON.stringify(request)]);

    await expect(repository.snapshot(10)).resolves.toEqual({
      current: null,
      pending: [request],
      limit: 10,
    });
  });

  it('clears only the song-request keys', async () => {
    redis.del.mockResolvedValue(2);

    await repository.clear();

    expect(redis.del).toHaveBeenCalledWith(
      'streamops:song-request:v1:pending',
      'streamops:song-request:v1:current',
    );
  });
});
