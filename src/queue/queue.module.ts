import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants.js';
import { QueueService } from './queue.service.js';
import { AutomationQueueService } from './automation-queue.service.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

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
      {
  name: QUEUE_NAMES.songResolution,
},
    ),
  ],

  providers: [
    QueueService,
    AutomationQueueService,

    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.getOrThrow<string>('redis.host'),
          port: config.getOrThrow<number>('redis.port'),
        });
      },
    },
  ],

  exports: [
    QueueService,
    AutomationQueueService,
    REDIS_CLIENT,
  ],
})
export class QueueModule {}