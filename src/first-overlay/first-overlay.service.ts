import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { StreamsService } from '../streams/streams.service.js';

@Injectable()
export class FirstOverlayService {
  private readonly logger = new Logger(FirstOverlayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamsService: StreamsService,
  ) { }

  async recordRedemption(event: Record<string, unknown>) {
    const reward = event.reward;

    if (typeof reward !== 'object' || reward === null || !('title' in reward)) {
      return null;
    }

    const rewardTitle =
      typeof reward.title === 'string'
        ? reward.title.replace(/[^a-z]/gi, '').toLowerCase()
        : '';

    if (rewardTitle !== 'first') {
      return null;
    }

    if (
      typeof event.id !== 'string' ||
      typeof event.user_id !== 'string' ||
      typeof event.user_login !== 'string' ||
      typeof event.user_name !== 'string' ||
      typeof event.redeemed_at !== 'string'
    ) {
      this.logger.warn('Ignoring malformed First redemption event');
      return null;
    }

    const redeemedAt = new Date(event.redeemed_at);

    if (Number.isNaN(redeemedAt.getTime())) {
      this.logger.warn('Ignoring First redemption with invalid timestamp');
      return null;
    }

    const stream = await this.streamsService.findActive();

    if (!stream) {
      this.logger.warn('Ignoring First redemption: no active stream');
      return null;
    }

    try {
      return await this.prisma.firstRedemption.create({
        data: {
          streamId: stream.id,
          twitchRedemptionId: event.id,
          userId: event.user_id,
          userLogin: event.user_login,
          userDisplayName: event.user_name,
          redeemedAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Another redemption already won this stream, or Twitch
        // delivered a duplicate notification. Never overwrite the winner.
        return null;
      }

      throw error;
    }
  }

  async getCurrentState() {
    const stream = await this.streamsService.findActive();

    if (!stream) {
      return { active: false, elapsedMs: 0, winner: null };
    }

    const winner = await this.prisma.firstRedemption.findUnique({
      where: { streamId: stream.id },
    });

    const elapsedMs = winner
      ? Math.max(0, winner.redeemedAt.getTime() - stream.startedAt.getTime())
      : Math.max(0, Date.now() - stream.startedAt.getTime());

    return {
      active: true,
      elapsedMs,
      winner: winner
        ? {
          displayName: winner.userDisplayName,
          elapsedMs: Math.max(
            0,
            winner.redeemedAt.getTime() - stream.startedAt.getTime(),
          ),
        }
        : null,
    };
  }
}