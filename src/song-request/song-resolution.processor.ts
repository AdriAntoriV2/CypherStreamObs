
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { SongRequestRepository } from './song-request.repository.js';
import { YouTubeResolverService } from './youtube-resolver.service.js';
import { PlaybackControllerService } from './playback-controller.service.js';

interface SongResolutionJob {
  requestId: string;
}

@Injectable()
@Processor(QUEUE_NAMES.songResolution, { concurrency: 2 })
export class SongResolutionProcessor extends WorkerHost {
  private readonly logger = new Logger(
    SongResolutionProcessor.name,
  );

  constructor(
    private readonly repository: SongRequestRepository,
    private readonly resolver: YouTubeResolverService,
    private readonly playbackController: PlaybackControllerService,
  ) {
    super();
  }

  async process(job: Job<SongResolutionJob>): Promise<void> {
    if (job.name !== 'song.resolve') {
      return;
    }

    const request = await this.repository.findById(
      job.data.requestId,
    );

    // The queue may have been cleared during an application restart.
    if (!request || request.status === 'failed') {
      return;
    }

    try {
      const track = await this.resolver.resolve(request.query);

      await this.repository.update({
        ...request,
        status: 'ready',
        track,
        error: undefined,
      });
      await this.playbackController.startNext();

      this.logger.log(
        `Resolved "${track.title}" for request ${request.id}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown YouTube resolution error';

      const attempts = Number(job.opts.attempts ?? 1);

      if (job.attemptsMade + 1 >= attempts) {
        await this.repository.update({
          ...request,
          status: 'failed',
          error: message,
          track: undefined,
        });

        this.logger.warn(
          `Song request ${request.id} failed: ${message}`,
        );
      }

      // BullMQ retries transient failures using the configured backoff.
      throw error;
    }
  }
}
