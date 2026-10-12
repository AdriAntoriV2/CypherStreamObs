
import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../queue/queue.module.js';
import { SongRequest, SongQueueSnapshot } from './song.request.types.js';

const PENDING_KEY = 'streamops:song-request:v1:pending';
const CURRENT_KEY = 'streamops:song-request:v1:current';

const ENQUEUE_SCRIPT = `
  local count = redis.call('LLEN', KEYS[1])
  local limit = tonumber(ARGV[2])

  if count >= limit then
    return 0
  end

  redis.call('RPUSH', KEYS[1], ARGV[1])
  return 1
`;

const SKIP_SCRIPT = `
  if redis.call('EXISTS', KEYS[2]) == 0 then
    return 0
  end

  redis.call('DEL', KEYS[2])
  return 1
`;

@Injectable()
export class SongRequestRepository {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async enqueue(
    request: SongRequest,
    limit: number,
  ): Promise<boolean> {
    const result = await this.redis.eval(
      ENQUEUE_SCRIPT,
      1,
      PENDING_KEY,
      JSON.stringify(request),
      String(limit),
    );

    return result === 1;
  }

  async snapshot(limit: number): Promise<SongQueueSnapshot> {
    const [currentRaw, pendingRaw] = await Promise.all([
      this.redis.get(CURRENT_KEY),
      this.redis.lrange(PENDING_KEY, 0, -1),
    ]);

    return {
      current: currentRaw
        ? (JSON.parse(currentRaw) as SongRequest)
        : null,
      pending: pendingRaw.map(
        (item: string) => JSON.parse(item) as SongRequest,
      ),
      limit,
    };
  }

  async skipCurrent(): Promise<boolean> {
    const result = await this.redis.eval(
      SKIP_SCRIPT,
      2,
      PENDING_KEY,
      CURRENT_KEY,
    );

    return result === 1;
  }

  async clear(): Promise<void> {
    await this.redis.del(PENDING_KEY, CURRENT_KEY);
  }
}
