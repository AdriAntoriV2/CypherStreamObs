import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
/*
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants.js';
*/

@Injectable()
export class QueueService {
  /*
  constructor(
    @InjectQueue(QUEUE_NAMES.events)
    private readonly eventsQueue: Queue,
  ) {}

  async addEvent(data: Record<string, unknown>) {
    return this.eventsQueue.add('event.received', data);
  }
  */

  async addEvent(
    _data: Record<string, unknown>,
  ): Promise<{ id: string | null }> {
    throw new ServiceUnavailableException(
      'Queue processing is temporarily disabled.',
    );
  }
}
