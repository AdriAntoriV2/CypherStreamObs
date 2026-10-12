
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

const CLAIM_NEXT_SCRIPT = `
  if redis.call('EXISTS', KEYS[2]) == 1 then
    return false
  end

  while redis.call('LLEN', KEYS[1]) > 0 do
    local item = redis.call('LINDEX', KEYS[1], 0)
    local request = cjson.decode(item)

    if request.status == 'failed' then
      redis.call('LPOP', KEYS[1])
    elseif request.status ~= 'ready' then
      return false
    else
      item = redis.call('LPOP', KEYS[1])
      redis.call('SET', KEYS[2], item)
      return item
    end
  end

  return false
`;

const COMPLETE_CURRENT_SCRIPT = `
  local item = redis.call('GET', KEYS[1])

  if not item then
    return 0
  end

  local request = cjson.decode(item)

  if request.id ~= ARGV[1] then
    return 0
  end

  redis.call('DEL', KEYS[1])
  return 1
`;

@Injectable()
export class SongRequestRepository {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) { }

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

  async claimNextReady(): Promise<SongRequest | null> {
    const result = await this.redis.eval(
      CLAIM_NEXT_SCRIPT,
      2,
      PENDING_KEY,
      CURRENT_KEY,
    );

    if (typeof result !== 'string') {
      return null;
    }

    return JSON.parse(result) as SongRequest;
  }

  async completeCurrent(requestId: string): Promise<boolean> {
    const result = await this.redis.eval(
      COMPLETE_CURRENT_SCRIPT,
      1,
      CURRENT_KEY,
      requestId,
    );

    return Number(result) === 1;
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
