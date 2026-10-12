import { Injectable } from '@nestjs/common';

const COOLDOWN_MS = 30_000;

@Injectable()
export class PointPoolCommandCooldownService {
  private readonly lastUsed = new Map<string, number>();
  private lastCleanupAt = Date.now();

  tryAcquire(userId: string, command: string): boolean {
    const now = Date.now();
    const key = `${userId}:${command}`;
    const lastUsedAt = this.lastUsed.get(key);

    if (
      lastUsedAt !== undefined &&
      now - lastUsedAt < COOLDOWN_MS
    ) {
      return false;
    }

    this.lastUsed.set(key, now);

    // Periodically remove expired entries to keep memory usage bounded.
    if (now - this.lastCleanupAt >= COOLDOWN_MS) {
      for (const [entry, timestamp] of this.lastUsed) {
        if (now - timestamp >= COOLDOWN_MS) {
          this.lastUsed.delete(entry);
        }
      }

      this.lastCleanupAt = now;
    }

    return true;
  }
}