import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants.js';
import { EventsProcessor } from './processors/events.processor.js';
import { QueueService } from './queue.service.js';
import { QueueController } from './queue.controller.js';
import { AutomationQueueService } from './automation-queue.service.js';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('redis.host'),
          port: config.getOrThrow<number>('redis.port'),
        },
      }),
    }),

    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.events,
      },
      {
        name: QUEUE_NAMES.automation,
      },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService, EventsProcessor, AutomationQueueService],
  exports: [QueueService, AutomationQueueService],
})
export class QueueModule { }