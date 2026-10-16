import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SongRequestRepository } from './song-request.repository.js';
import type { SongRequest } from './song-request.types.js';
import {
  PLAYBACK_ENGINE,
  type PlaybackEngine,
} from './playback-engine.js';

@Injectable()
export class PlaybackControllerService implements OnModuleDestroy {
  private readonly logger = new Logger(
    PlaybackControllerService.name,
  );

  private readonly queueLimit: number;

  // Serialize lifecycle operations to prevent skip/end races.
  private transition: Promise<void> = Promise.resolve();

  // Radio mode controls whether song requests can be played.
  private radioEnabled = false;

  // Incremented whenever the mode changes to invalidate in-flight requests.
  private modeVersion = 0;

  private readonly unsubscribeTrackEnded: () => void;

  constructor(
    private readonly repository: SongRequestRepository,
    @Inject(PLAYBACK_ENGINE)
    private readonly engine: PlaybackEngine,
    private readonly configService: ConfigService,
  ) {
    this.queueLimit =
      this.configService.getOrThrow<number>(
        'songRequest.queueLimit',
      );

    this.unsubscribeTrackEnded = this.engine.onTrackEnded(
      (requestId) => {
        void this.handleTrackEnded(requestId).catch(
          (error: unknown) => {
            this.logger.error(
              `Failed to advance playback after track ${requestId} ended`,
              error instanceof Error
                ? error.stack
                : String(error),
            );
          },
        );
      },
    );
  }

  onModuleDestroy(): void {
    this.unsubscribeTrackEnded();
  }

  private serialize<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const result = this.transition.then(
      operation,
      operation,
    );

    this.transition = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  isRadioEnabled(): boolean {
    return this.radioEnabled;
  }

  getModeVersion(): number {
    return this.modeVersion;
  }

  /**
   * Toggles radio mode.
   * Enabling starts radio when no song is queued.
   * Disabling stops playback and clears the request queue.
   */
  toggleRadio(): Promise<boolean> {
    return this.serialize(async () => {
      if (this.radioEnabled) {
        // Disable first so future playback advancement is blocked.
        this.radioEnabled = false;
        this.modeVersion++;

        try {
          await this.engine.stopTrack();
        } catch (error) {
          this.logger.warn(
            `Failed to stop playback while disabling radio: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          );
        }

        await this.repository.clear();

        this.logger.log('Radio mode disabled');
        return false;
      }

      this.radioEnabled = true;
      this.modeVersion++;

      try {
        await this.startNextUnlocked();

        this.logger.log('Radio mode enabled');
        return true;
      } catch (error) {
        this.radioEnabled = false;
        this.modeVersion++;

        throw error;
      }
    });
  }

  startNext(): Promise<SongRequest | null> {
    return this.serialize(() => this.startNextUnlocked());
  }

  handleTrackEnded(requestId: string): Promise<boolean> {
    return this.serialize(async () => {
      const completed =
        await this.repository.completeCurrent(requestId);

      // Ignore stale mpv events for tracks that are no longer current.
      if (!completed) {
        this.logger.debug(
          `Ignoring stale playback completion for ${requestId}`,
        );
        return false;
      }

      await this.startNextUnlocked();
      return true;
    });
  }

  skip(): Promise<boolean> {
    return this.serialize(async () => {
      if (!this.radioEnabled) {
        return false;
      }

      const snapshot = await this.repository.snapshot(
        this.queueLimit,
      );

      if (!snapshot.current) {
        return false;
      }

      const currentId = snapshot.current.id;

      // Stop the old track before advancing to the next one.
      await this.engine.stopTrack();

      const completed =
        await this.repository.completeCurrent(currentId);

      if (!completed) {
        return false;
      }

      await this.startNextUnlocked();
      return true;
    });
  }

  private async startNextUnlocked(): Promise<SongRequest | null> {
    // Critical: resolution workers and track-ended events must not
    // restart playback after radio mode has been disabled.
    if (!this.radioEnabled) {
      return null;
    }

    const request = await this.repository.claimNextReady();

    if (request) {
      if (request.status !== 'ready' || !request.track) {
        this.logger.error(
          `Claimed request ${request.id} has no playable track`,
        );

        await this.repository.completeCurrent(request.id);
        return this.startNextUnlocked();
      }

      try {
        await this.engine.playTrack(
          request.track,
          request.id,
        );

        this.logger.log(
          `Started "${request.track.title}" (${request.id})`,
        );

        return request;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        this.logger.error(
          `Failed to start request ${request.id}: ${message}`,
        );

        await this.repository.completeCurrent(request.id);

        // Don't leave the queue stuck if mpv rejects a track.
        return this.startNextUnlocked();
      }
    }

    const snapshot = await this.repository.snapshot(
      this.queueLimit,
    );

    // Another request may be playing, or the queue head may
    // still be resolving. Preserve request order in either case.
    if (snapshot.current || snapshot.pending.length > 0) {
      return null;
    }

    await this.engine.startRadio();
    return null;
  }
}