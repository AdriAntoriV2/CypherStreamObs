
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
    onTrackEnded: vi.fn(),
  };

  const configService = { getOrThrow: vi.fn() };

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

    engine.onTrackEnded.mockReturnValue(vi.fn());

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

  async function enableRadio(): Promise<void> {
    await controller.toggleRadio();

    // Keep the radio enabled but clear setup calls from the test assertions.
    vi.clearAllMocks();

    // Restore the default mock implementations after clearing call history.
    engine.onTrackEnded.mockReturnValue(vi.fn());

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
  }

  it('subscribes to track-ended events', () => {
    expect(engine.onTrackEnded).toHaveBeenCalledOnce();
    expect(engine.onTrackEnded).toHaveBeenCalledWith(expect.any(Function));
  });

  it('unsubscribes from track-ended events on destruction', () => {
    const unsubscribe = engine.onTrackEnded.mock.results[0]?.value;

    controller.onModuleDestroy();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('plays the next ready request', async () => {
    await enableRadio();
    repository.claimNextReady.mockResolvedValue(request);

    await expect(controller.startNext()).resolves.toEqual(request);

    expect(engine.playTrack).toHaveBeenCalledWith(request.track, request.id);
    expect(engine.startRadio).not.toHaveBeenCalled();
  });

  it('does not start radio while requests are pending', async () => {
    await enableRadio();

    repository.snapshot.mockResolvedValue({
      current: null,
      pending: [
        { ...request, status: 'resolving', track: undefined },
      ],
      limit: 10,
    });

    await expect(controller.startNext()).resolves.toBeNull();

    expect(engine.startRadio).not.toHaveBeenCalled();
  });

  it('starts radio when the queue is empty', async () => {
    await enableRadio();

    await controller.startNext();

    expect(engine.startRadio).toHaveBeenCalledOnce();
  });

  it('advances when the current track ends', async () => {
    await enableRadio();

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
    await enableRadio();

    repository.completeCurrent.mockResolvedValue(false);

    await expect(
      controller.handleTrackEnded('old-request'),
    ).resolves.toBe(false);

    expect(repository.claimNextReady).not.toHaveBeenCalled();
    expect(engine.startRadio).not.toHaveBeenCalled();
  });

  it('stops and completes the current request when skipping', async () => {
    await enableRadio();

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
    await enableRadio();

    await expect(controller.skip()).resolves.toBe(false);

    expect(engine.stopTrack).not.toHaveBeenCalled();
  });
});
