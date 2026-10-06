import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { AutomationQueueService } from '../automation-queue.service.js';
import { QUEUE_NAMES } from '../queue.constants.js';

@Injectable()
@Processor(QUEUE_NAMES.events)
export class EventsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationQueueService: AutomationQueueService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    console.log(
      `[EventsProcessor] Processing job ${job.id}:`,
      job.name,
      job.data,
    );

    if (job.name !== 'event.received') {
      return;
    }

    const event = await this.prisma.streamEvent.findUnique({
      where: {
        id: job.data.eventId,
      },
    });

    if (!event) {
      throw new Error(
        `Event ${job.data.eventId} not found`,
      );
    }

    const rules =
      await this.prisma.automationRule.findMany({
        where: {
          eventType: event.type,
          enabled: true,
        },
        orderBy: {
          priority: 'desc',
        },
      });

    for (const rule of rules) {
      await this.automationQueueService.enqueueRuleExecution(
        event.id,
        rule.id,
      );
    }

    console.log(
      `[EventsProcessor] Enqueued ${rules.length} automation job(s) for event ${event.id}`,
    );
  }
}