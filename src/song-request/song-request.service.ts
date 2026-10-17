
import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { SongRequestRepository } from './song-request.repository.js';
import type {
  SongQueueSnapshot,
  SongRequest,
} from './song-request.types.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { PlaybackControllerService } from './playback-controller.service.js';

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
    private readonly playbackController: PlaybackControllerService,
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

  async toggleRadio(): Promise<boolean> {
    const enabled = await this.playbackController.toggleRadio();

    if (!enabled) {
      await this.resolutionQueue.drain(true);

      for (const [requestId, waiter] of this.resolutionWaiters) {
        this.resolutionWaiters.delete(requestId);
        waiter.reject(
          new ConflictException(
            'Song requests are disabled.',
          ),
        );
      }
    }

    return enabled;
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
      throw new BadRequestException(
        'A YouTube URL or search query is required.',
      );
    }

    // Capture the current mode so a concurrent toggle invalidates
    // this request even if radio is enabled again immediately.
    const modeVersion =
      this.playbackController.getModeVersion();

    if (!this.playbackController.isRadioEnabled()) {
      throw new ConflictException(
        'Song requests are disabled. Use !radio to enable them.',
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
      throw new ConflictException(
        `The song request queue is full (${this.queueLimit} pending requests).`,
      );
    }

    // Radio may have been toggled while Redis was processing enqueue.
    if (
      !this.playbackController.isRadioEnabled() ||
      this.playbackController.getModeVersion() !== modeVersion
    ) {
      await this.repository.remove(request.id);

      throw new ConflictException(
        'Radio mode changed before the request could be accepted.',
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

      // Avoid an unhandled rejection if the waiter is rejected
      // before this method reaches its final await.
      void resolutionPromise.catch(() => {});
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

      // Check again in case radio was toggled during job creation.
      if (
        !this.playbackController.isRadioEnabled() ||
        this.playbackController.getModeVersion() !== modeVersion
      ) {
        throw new ConflictException(
          'Radio mode changed before the request could be accepted.',
        );
      }
    } catch (error) {
      this.resolutionWaiters.delete(request.id);
      await this.repository.remove(request.id);

      // The job might have been added after the queue was drained.
      const job = await this.resolutionQueue.getJob(request.id);

      if (job) {
        await job.remove().catch(() => undefined);
      }

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
    if (!this.playbackController.isRadioEnabled()) {
      return false;
    }

    return this.repository.skipCurrent();
  }
}
