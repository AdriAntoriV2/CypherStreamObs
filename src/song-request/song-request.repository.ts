
import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../queue/queue.module.js';
import type {
  SongQueueSnapshot,
  SongRequest,
} from './song-request.types.js';

const PENDING_KEY = 'streamops:song-request:v1:pending';
const CURRENT_KEY = 'streamops:song-request:v1:current';

const ENQUEUE_SCRIPT = `
  local items = redis.call('LRANGE', KEYS[1], 0, -1)
  local active = 0

  for _, item in ipairs(items) do
    local request = cjson.decode(item)
    if request.status ~= 'failed' then
      active = active + 1
    end
  end

  if active >= tonumber(ARGV[2]) then
    return 0
  end

  redis.call('RPUSH', KEYS[1], ARGV[1])
  return 1
`;

const UPDATE_SCRIPT = `
  local items = redis.call('LRANGE', KEYS[1], 0, -1)

  for index, item in ipairs(items) do
    local request = cjson.decode(item)

    if request.id == ARGV[1] then
      redis.call('LSET', KEYS[1], index - 1, ARGV[2])
      return 1
    end
  end

  return 0
`;

const REMOVE_SCRIPT = `
  local items = redis.call('LRANGE', KEYS[1], 0, -1)

  for _, item in ipairs(items) do
    local request = cjson.decode(item)

    if request.id == ARGV[1] then
      redis.call('LREM', KEYS[1], 1, item)
      return 1
    end
  end

  return 0
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

    return Number(result) === 1;
  }

  async findById(id: string): Promise<SongRequest | null> {
    const items = await this.redis.lrange(PENDING_KEY, 0, -1);

    for (const item of items) {
      const request = JSON.parse(item) as SongRequest;

      if (request.id === id) {
        return request;
      }
    }

    return null;
  }

  async update(request: SongRequest): Promise<boolean> {
    const result = await this.redis.eval(
      UPDATE_SCRIPT,
      1,
      PENDING_KEY,
      request.id,
      JSON.stringify(request),
    );

    return Number(result) === 1;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.redis.eval(
      REMOVE_SCRIPT,
      1,
      PENDING_KEY,
      id,
    );

    return Number(result) === 1;
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
      `
        if redis.call('EXISTS', KEYS[1]) == 0 then
          return 0
        end

        redis.call('DEL', KEYS[1])
        return 1
      `,
      1,
      CURRENT_KEY,
    );

    return Number(result) === 1;
  }

  async clear(): Promise<void> {
    await this.redis.del(PENDING_KEY, CURRENT_KEY);
  }
}
