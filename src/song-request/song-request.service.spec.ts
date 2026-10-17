
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SongRequestRepository } from './song-request.repository.js';
import { SongRequestService } from './song-request.service.js';

describe('SongRequestService', () => {
  const repository = {
    clear: vi.fn(),
    enqueue: vi.fn(),
    snapshot: vi.fn(),
    skipCurrent: vi.fn(),
    remove: vi.fn(),
  };

  const resolutionQueue = {
    add: vi.fn(),
    drain: vi.fn(),
  };

  const configService = { getOrThrow: vi.fn() };

  const playbackController = {
    getModeVersion: vi.fn(),
    isRadioEnabled: vi.fn(),
  };

  let service: SongRequestService;

  const requester = {
    id: 'user-1',
    login: 'testuser',
    displayName: 'Test User',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    configService.getOrThrow.mockReturnValue(10);

    repository.remove.mockResolvedValue(true);
    repository.enqueue.mockResolvedValue(true);

    resolutionQueue.add.mockResolvedValue({});
    resolutionQueue.drain.mockResolvedValue(undefined);

    playbackController.getModeVersion.mockReturnValue(0);
    playbackController.isRadioEnabled.mockReturnValue(true);

    service = new SongRequestService(
      repository as unknown as SongRequestRepository,
      resolutionQueue as never,
      configService as never,
      playbackController as never,
    );
  });

  it('clears temporary queue state on startup', async () => {
    await service.onModuleInit();

    expect(repository.clear).toHaveBeenCalledOnce();
    expect(resolutionQueue.drain).toHaveBeenCalledWith(true);
  });

  it('adds a request with trimmed query and requester identity', async () => {
    const request = await service.addRequest({
      query: '  test song  ',
      requester,
    });

    expect(request.query).toBe('test song');
    expect(request.requester.login).toBe('testuser');
    expect(request.id).toBeTruthy();
    expect(request.status).toBe('resolving');

    expect(repository.enqueue).toHaveBeenCalledWith(request, 10);

    expect(resolutionQueue.add).toHaveBeenCalledWith(
      'song.resolve',
      { requestId: request.id },
      expect.objectContaining({
        jobId: request.id,
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });

  it('rejects an empty query', async () => {
    await expect(
      service.addRequest({
        query: '   ',
        requester,
      }),
    ).rejects.toThrow('A YouTube URL or search query is required');

    expect(repository.enqueue).not.toHaveBeenCalled();
    expect(resolutionQueue.add).not.toHaveBeenCalled();
  });

  it('rejects requests when the queue is full', async () => {
    repository.enqueue.mockResolvedValue(false);

    await expect(
      service.addRequest({
        query: 'test song',
        requester,
      }),
    ).rejects.toThrow('queue is full');

    expect(resolutionQueue.add).not.toHaveBeenCalled();
  });
});
