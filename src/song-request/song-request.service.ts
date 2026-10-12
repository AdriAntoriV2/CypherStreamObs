
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
import { ConfigService } from '@nestjs/config';

type ResolutionWaiter = {
  resolve: (request: SongRequest) => void;
  reject: (error: Error) => void;
};

@Injectable()
export class SongRequestService implements OnModuleInit {
  private readonly queueLimit: number;
  private readonly resolutionWaiters = new Map<
    string,
    ResolutionWaiter
  >();

  constructor(
    private readonly repository: SongRequestRepository,
    @InjectQueue(QUEUE_NAMES.songResolution)
    private readonly resolutionQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.queueLimit =
      this.configService.getOrThrow<number>(
        'songRequest.queueLimit',
      );
  }

  async onModuleInit(): Promise<void> {
    // Both the request list and resolution jobs are ephemeral.
    await this.repository.clear();
    await this.resolutionQueue.drain(true);
  }


  async addRequest(input: {
    query: string;
    requester: SongRequest['requester'];
  }): Promise<SongRequest> {
    return this.enqueueRequest(input, false);
  }

  async addRequestAndWait(input: {
    query: string;
    requester: SongRequest['requester'];
  }): Promise<SongRequest> {
    return this.enqueueRequest(input, true);
  }

  private async enqueueRequest(
    input: {
      query: string;
      requester: SongRequest['requester'];
    },
    waitForResolution: boolean,
  ): Promise<SongRequest> {
    const query = input.query.trim();

    if (!query) {
      throw new Error(
        'A YouTube URL or search query is required',
      );
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

    let resolutionPromise: Promise<SongRequest> | undefined;

    if (waitForResolution) {
      resolutionPromise = new Promise<SongRequest>(
        (resolve, reject) => {
          this.resolutionWaiters.set(request.id, {
            resolve,
            reject,
          });
        },
      );

      // The worker could finish before this method reaches its await.
      // Attach a handler now to avoid an unhandled rejection.
      void resolutionPromise.catch(() => { });
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
      this.resolutionWaiters.delete(request.id);
      await this.repository.remove(request.id);
      throw error;
    }

    return resolutionPromise
      ? await resolutionPromise
      : request;
  }

  notifyResolution(request: SongRequest): void {
    const waiter = this.resolutionWaiters.get(request.id);

    if (!waiter) {
      return;
    }

    this.resolutionWaiters.delete(request.id);
    waiter.resolve(request);
  }

  notifyResolutionFailure(
    requestId: string,
    message: string,
  ): void {
    const waiter = this.resolutionWaiters.get(requestId);

    if (!waiter) {
      return;
    }

    this.resolutionWaiters.delete(requestId);
    waiter.reject(new Error(message));
  }

  getQueue(): Promise<SongQueueSnapshot> {
    return this.repository.snapshot(this.queueLimit);
  }

  async skipCurrent(): Promise<boolean> {
    return this.repository.skipCurrent();
  }
}
