import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../queue/queue.module.js';

const STATE_TTL_SECONDS = 5 * 60;

@Injectable()
export class TwitchOAuthStateService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async create(): Promise<string> {
    const state =
      randomBytes(32).toString('base64url');

    const key =
      `twitch:oauth:state:${state}`;

    await this.redis.set(
      key,
      '1',
      'EX',
      STATE_TTL_SECONDS,
    );

    return state;
  }

  async consume(
    state: string,
  ): Promise<boolean> {
    if (!state) {
      return false;
    }

    const key =
      `twitch:oauth:state:${state}`;

    const result =
      await this.redis.eval(
        `
          local value = redis.call('GET', KEYS[1])

          if not value then
            return 0
          end

          redis.call('DEL', KEYS[1])

          return 1
        `,
        1,
        key,
      );

    return result === 1;
  }
}