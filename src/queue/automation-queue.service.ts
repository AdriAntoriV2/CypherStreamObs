import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants.js';

@Injectable()
export class AutomationQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.automation)
    private readonly automationQueue: Queue,
  ) {}

  async enqueueRuleExecution(
    eventId: string,
    ruleId: string,
  ) {
    return this.automationQueue.add(
      'automation.execute',
      {
        eventId,
        ruleId,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1_000,
        },
      },
    );
  }
}