
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { SongRequestRepository } from './song-request.repository.js';
import type {
  SongQueueSnapshot,
  SongRequest,
} from './song-request.types.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

const DEFAULT_QUEUE_LIMIT = 10;

@Injectable()
export class SongRequestService implements OnModuleInit {
  private readonly queueLimit = DEFAULT_QUEUE_LIMIT;

  constructor(
    private readonly repository: SongRequestRepository,
    @InjectQueue(QUEUE_NAMES.songResolution)
    private readonly resolutionQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Both the request list and resolution jobs are ephemeral.
    await this.repository.clear();
    await this.resolutionQueue.drain(true);
  }

  async addRequest(input: {
    query: string;
    requester: SongRequest['requester'];
  }): Promise<SongRequest> {
    const query = input.query.trim();

    if (!query) {
      throw new Error('A YouTube URL or search query is required');
    }

    const request: SongRequest = {
      id: randomUUID(),
      query,
      requester: input.requester,
      requestedAt: new Date().toISOString(),
      status: 'resolving',
    };

    const added = await this.repository.enqueue(
      request,
      this.queueLimit,
    );

    if (!added) {
      throw new Error(
        `The song request queue is full (${this.queueLimit} pending requests)`,
      );
    }

    try {
      await this.resolutionQueue.add(
        'song.resolve',
        { requestId: request.id },
        {
          jobId: request.id,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1_000,
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (error) {
      await this.repository.remove(request.id);
      throw error;
    }

    return request;
  }

  getQueue(): Promise<SongQueueSnapshot> {
    return this.repository.snapshot(this.queueLimit);
  }

  async skipCurrent(): Promise<boolean> {
    return this.repository.skipCurrent();
  }
}
