import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants.js';
import { QueueService } from './queue.service.js';
import { AutomationQueueService } from './automation-queue.service.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

function getBullRedisConnection(redisUrl: string) {
  const url = new URL(redisUrl);

  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error('REDIS_URL must use redis:// or rediss://');
  }

  const database = url.pathname.replace(/^\//, '');

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.username
      ? { username: decodeURIComponent(url.username) }
      : {}),
    ...(url.password
      ? { password: decodeURIComponent(url.password) }
      : {}),
    ...(database ? { db: Number(database) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: getBullRedisConnection(
          config.getOrThrow<string>('redis.url'),
        ),
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
        return new Redis(
          config.getOrThrow<string>('redis.url'),
        );
      },
    },
  ],

  exports: [
    QueueService,
    AutomationQueueService,
    REDIS_CLIENT,
    BullModule,
  ],
})
export class QueueModule {}