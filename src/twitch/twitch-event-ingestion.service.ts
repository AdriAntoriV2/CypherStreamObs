import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventsService } from '../events/events.service.js';
import { StreamsService } from '../streams/streams.service.js';

@Injectable()
export class TwitchEventIngestionService {
  private readonly logger =
    new Logger(
      TwitchEventIngestionService.name,
    );

  constructor(
    private readonly eventsService: EventsService,
    private readonly streamsService: StreamsService,
  ) {}

  async ingest(
    type: string,
    externalId: string,
    payload: Record<string, unknown>,
  ) {
    const stream =
      await this.streamsService.findActive();

    if (!stream) {
      this.logger.warn(
        `Ignoring Twitch event ${type}: no active stream`,
      );

      return null;
    }

    return this.eventsService.create({
      streamId: stream.id,
      type,
      externalId,
      payload,
    });
  }
}