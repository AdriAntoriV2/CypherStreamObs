
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

  const configService = {
    getOrThrow: vi.fn(),
  };

  let service: SongRequestService;

  beforeEach(() => {
    vi.resetAllMocks();

    configService.getOrThrow.mockReturnValue(10);

    repository.remove.mockResolvedValue(true);
    resolutionQueue.add.mockResolvedValue({});
    resolutionQueue.drain.mockResolvedValue(undefined);

    service = new SongRequestService(
      repository as unknown as SongRequestRepository,
      resolutionQueue as never,
      configService as never,
    );
  });

  it('clears temporary queue state on startup', async () => {
    await service.onModuleInit();

    expect(repository.clear).toHaveBeenCalledOnce();
    expect(resolutionQueue.drain).toHaveBeenCalledOnce();
  });

  it('adds a request with trimmed query and requester identity', async () => {
    repository.enqueue.mockResolvedValue(true);

    const request = await service.addRequest({
      query: '  test song  ',
      requester: {
        id: 'user-1',
        login: 'testuser',
        displayName: 'Test User',
      },
    });

    expect(request.query).toBe('test song');
    expect(request.requester.login).toBe('testuser');
    expect(request.id).toBeTruthy();
    expect(request.status).toBe('resolving');
    expect(repository.enqueue).toHaveBeenCalledWith(request, 10);
    expect(resolutionQueue.add).toHaveBeenCalledOnce();
  });

  it('rejects an empty query', async () => {
    await expect(
      service.addRequest({
        query: '   ',
        requester: {
          id: 'user-1',
          login: 'testuser',
          displayName: 'Test User',
        },
      }),
    ).rejects.toThrow('A YouTube URL or search query is required');

    expect(repository.enqueue).not.toHaveBeenCalled();
  });

  it('rejects requests when the queue is full', async () => {
    repository.enqueue.mockResolvedValue(false);

    await expect(
      service.addRequest({
        query: 'test song',
        requester: {
          id: 'user-1',
          login: 'testuser',
          displayName: 'Test User',
        },
      }),
    ).rejects.toThrow('queue is full');

    expect(resolutionQueue.add).not.toHaveBeenCalled();
  });
});
