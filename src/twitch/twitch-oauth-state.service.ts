import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
/*
import { Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../queue/queue.module.js';
*/

const STATE_TTL_SECONDS = 5 * 60;

@Injectable()
export class TwitchOAuthStateService {
  private readonly states = new Map<string, number>();

  /*
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}
  */

  async create(): Promise<string> {
    const state = randomBytes(32).toString('base64url');

    this.removeExpiredStates();
    this.states.set(state, Date.now() + STATE_TTL_SECONDS * 1_000);

    return state;
  }

  async consume(state: string): Promise<boolean> {
    if (!state) {
      return false;
    }

    /*
    const key = `twitch:oauth:state:${state}`;
    const result = await this.redis.eval(
      `
        local value = redis.call('GET', KEYS[1])

        if value ~= '1' then
          return 0
        end

        redis.call('DEL', KEYS[1])

        return 1
      `,
      1,
      key,
    );

    return result === 1;
    */

    const expiresAt = this.states.get(state);
    this.states.delete(state);

    return expiresAt !== undefined && expiresAt > Date.now();
  }

  private removeExpiredStates(): void {
    const now = Date.now();

    for (const [state, expiresAt] of this.states) {
      if (expiresAt <= now) {
        this.states.delete(state);
      }
    }
  }
}