
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

  it('claims a ready request atomically', async () => {
    const readyRequest: SongRequest = {
      ...request,
      status: 'ready',
      track: {
        id: 'youtube-1',
        title: 'Test Song',
        url: 'https://www.youtube.com/watch?v=youtube-1',
        duration: 180,
        thumbnail: null,
        uploader: 'Test Artist',
      },
    };

    redis.eval.mockResolvedValue(JSON.stringify(readyRequest));

    await expect(repository.claimNextReady()).resolves.toEqual(
      readyRequest,
    );

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      2,
      'streamops:song-request:v1:pending',
      'streamops:song-request:v1:current',
    );
  });

  it('returns null when no request can be claimed', async () => {
    redis.eval.mockResolvedValue(null);

    await expect(repository.claimNextReady()).resolves.toBeNull();
  });

  it('completes the current request only when its ID matches', async () => {
    redis.eval.mockResolvedValue(1);

    await expect(
      repository.completeCurrent('request-1'),
    ).resolves.toBe(true);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'streamops:song-request:v1:current',
      'request-1',
    );
  });

  it('returns false when the current request cannot be completed', async () => {
    redis.eval.mockResolvedValue(0);

    await expect(
      repository.completeCurrent('stale-request'),
    ).resolves.toBe(false);
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
