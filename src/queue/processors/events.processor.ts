import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';

@Injectable()
@Processor(QUEUE_NAMES.events)
export class EventsProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    console.log(
      `[EventsProcessor] Processing job ${job.id}:`,
      job.name,
      job.data,
    );
  }
}
