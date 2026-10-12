
import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SongRequest, SongQueueSnapshot } from './song.request.types.js';
import { SongRequestRepository } from './song.request.repository.js';

const DEFAULT_QUEUE_LIMIT = 10;

@Injectable()
export class SongRequestService implements OnModuleInit {
  private readonly queueLimit = DEFAULT_QUEUE_LIMIT;

  constructor(
    private readonly repository: SongRequestRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    // Song requests are intentionally ephemeral across app restarts.
    await this.repository.clear();
  }

  async addRequest(input: {
    query: string;
    requester: SongRequest['requester'];
  }): Promise<SongRequest> {
    const query = input.query.trim();

    if (!query) {
      throw new Error('A song URL or search query is required');
    }

    const request: SongRequest = {
      id: randomUUID(),
      query,
      requester: input.requester,
      requestedAt: new Date().toISOString(),
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

    return request;
  }

  getQueue(): Promise<SongQueueSnapshot> {
    return this.repository.snapshot(this.queueLimit);
  }

  async skipCurrent(): Promise<boolean> {
    return this.repository.skipCurrent();
  }
}
