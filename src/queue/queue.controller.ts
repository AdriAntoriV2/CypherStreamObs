import { Controller, Post } from '@nestjs/common';
import { QueueService } from './queue.service.js';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('test')
  async test() {
    const job = await this.queueService.addEvent({
      source: 'manual-test',
      message: 'StreamOps BullMQ test',
      timestamp: new Date().toISOString(),
    });

    return {
      queued: true,
      jobId: job.id,
    };
  }
}
