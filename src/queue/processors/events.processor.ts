
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { QUEUE_NAMES } from '../queue.constants.js';

@Injectable()
@Processor(QUEUE_NAMES.events)
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'event.received') {
      this.logger.warn(`Ignoring unsupported event job: ${job.name}`);
      return;
    }

    const eventId = job.data?.eventId;

    if (typeof eventId !== 'string') {
      throw new Error('Event job is missing a valid eventId');
    }

    const event = await this.prisma.streamEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        type: true,
        streamId: true,
      },
    });

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    this.logger.debug(
      `Processed stream event ${event.id} (${event.type}) for stream ${event.streamId}`,
    );
  }
}
