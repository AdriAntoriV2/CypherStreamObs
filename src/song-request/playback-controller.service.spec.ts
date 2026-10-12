import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PlaybackControllerService } from './playback-controller.service.js';
import type { SongRequest } from './song-request.types.js';
import type { SongRequestRepository } from './song-request.repository.js';
import type { PlaybackEngine } from './playback-engine.js';

describe('PlaybackControllerService', () => {
  const repository = {
    claimNextReady: vi.fn(),
    completeCurrent: vi.fn(),
    snapshot: vi.fn(),
  };

  const engine = {
    playTrack: vi.fn(),
    stopTrack: vi.fn(),
    startRadio: vi.fn(),
  };

  const configService = {
    getOrThrow: vi.fn(),
  };

  let controller: PlaybackControllerService;

  const request: SongRequest = {
    id: 'request-1',
    query: 'Test song',
    requester: {
      id: 'user-1',
      login: 'viewer',
      displayName: 'Viewer',
    },
    requestedAt: new Date().toISOString(),
    status: 'ready',
    track: {
      id: 'track-1',
      title: 'Test Song',
      url: 'https://www.youtube.com/watch?v=track-1',
      duration: 180,
      thumbnail: null,
      uploader: 'Test Artist',
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    configService.getOrThrow.mockReturnValue(10);

    repository.claimNextReady.mockResolvedValue(null);
    repository.completeCurrent.mockResolvedValue(true);
    repository.snapshot.mockResolvedValue({
      current: null,
      pending: [],
      limit: 10,
    });

    engine.playTrack.mockResolvedValue(undefined);
    engine.stopTrack.mockResolvedValue(undefined);
    engine.startRadio.mockResolvedValue(undefined);

    controller = new PlaybackControllerService(
      repository as unknown as SongRequestRepository,
      engine as unknown as PlaybackEngine,
      configService as unknown as ConfigService,
    );
  });

  it('plays the next ready request', async () => {
    repository.claimNextReady.mockResolvedValue(request);

    await expect(controller.startNext()).resolves.toEqual(request);

    expect(engine.playTrack).toHaveBeenCalledWith(request.track);
    expect(engine.startRadio).not.toHaveBeenCalled();
  });

  it('does not start radio while requests are pending', async () => {
    repository.snapshot.mockResolvedValue({
      current: null,
      pending: [{ ...request, status: 'resolving', track: undefined }],
      limit: 10,
    });

    await expect(controller.startNext()).resolves.toBeNull();

    expect(engine.startRadio).not.toHaveBeenCalled();
  });

  it('starts radio when the queue is empty', async () => {
    await controller.startNext();

    expect(engine.startRadio).toHaveBeenCalledOnce();
  });

  it('advances when the current track ends', async () => {
    repository.claimNextReady.mockResolvedValueOnce(null);
    repository.snapshot.mockResolvedValueOnce({
      current: null,
      pending: [],
      limit: 10,
    });

    await expect(
      controller.handleTrackEnded('request-1'),
    ).resolves.toBe(true);

    expect(repository.completeCurrent).toHaveBeenCalledWith('request-1');
    expect(engine.startRadio).toHaveBeenCalledOnce();
  });

  it('ignores a stale track-ended event', async () => {
    repository.completeCurrent.mockResolvedValue(false);

    await expect(
      controller.handleTrackEnded('old-request'),
    ).resolves.toBe(false);

    expect(repository.claimNextReady).not.toHaveBeenCalled();
    expect(engine.startRadio).not.toHaveBeenCalled();
  });

  it('stops and completes the current request when skipping', async () => {
    repository.snapshot.mockResolvedValue({
      current: request,
      pending: [],
      limit: 10,
    });

    await expect(controller.skip()).resolves.toBe(true);

    expect(engine.stopTrack).toHaveBeenCalledOnce();
    expect(repository.completeCurrent).toHaveBeenCalledWith(request.id);
  });

  it('does nothing when skip is called without a current request', async () => {
    await expect(controller.skip()).resolves.toBe(false);

    expect(engine.stopTrack).not.toHaveBeenCalled();
  });
});