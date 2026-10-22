import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import WebSocket from 'ws';
import { TwitchApiClient } from './twitch-api.client.js';
import {
  TwitchEventSubMessage,
  TwitchSession,
} from './types/twitch-eventsub.types.js';
import { EventsService } from '../events/events.service.js';
import { TwitchEventNormalizer } from './twitch-event-normalizer.service.js';
import { StreamsService } from '../streams/streams.service.js';
import { TwitchEventIngestionService } from './twitch-event-ingestion.service.js';
import { ChatCommandDispatcher } from '../commands/chat-command-dispatcher.service.js';
import { PointPoolService } from '../point-pool/point-pool.service.js';
import { FirstOverlayService } from '../first-overlay/first-overlay.service.js';
import { ChatOverlayService } from '../chat-overlay/chat-overlay.service.js';

@Injectable()
export class TwitchEventSubService
  implements OnModuleDestroy {
  private readonly logger =
    new Logger(TwitchEventSubService.name);

  private socket: WebSocket | null = null;
  private session: TwitchSession | null = null;

  private accessToken: string | null = null;
  private broadcasterUserId: string | null = null;
  prisma: any;

  constructor(
    private readonly twitchApi: TwitchApiClient,
    private readonly streamsService: StreamsService,
    private readonly eventsService: EventsService,
    private readonly normalizer: TwitchEventNormalizer,
    private readonly ingestionService: TwitchEventIngestionService,
    private readonly chatCommandDispatcher: ChatCommandDispatcher,
    private readonly pointPoolService: PointPoolService,
    private readonly firstOverlayService: FirstOverlayService,
    private readonly chatOverlayService: ChatOverlayService,
  ) { }

  async connect(
    accessToken: string,
    broadcasterUserId: string,
  ) {
    this.accessToken = accessToken;
    this.broadcasterUserId =
      broadcasterUserId;

    await this.openSocket();
  }

  private async openSocket(
    url = 'wss://eventsub.wss.twitch.tv/ws',
  ): Promise<void> {
    return new Promise(
      (resolve, reject) => {
        const socket =
          new WebSocket(url);

        this.socket = socket;

        socket.on('open', () => {
          this.logger.log(
            'Connected to Twitch EventSub',
          );
        });

        socket.on(
          'message',
          async (data) => {
            try {
              await this.handleMessage(
                JSON.parse(
                  data.toString(),
                ) as TwitchEventSubMessage,
              );

              resolve();
            } catch (error) {
              reject(error);
            }
          },
        );

        socket.on('error', (error) => {
          this.logger.error(
            'Twitch EventSub WebSocket error',
            error,
          );
        });

        socket.on('close', () => {
          this.logger.warn(
            'Twitch EventSub WebSocket closed',
          );

          this.socket = null;
          this.session = null;
        });
      },
    );
  }

  private async syncCurrentStream(): Promise<void> {
    if (!this.accessToken || !this.broadcasterUserId) {
      throw new Error(
        'Twitch credentials are unavailable',
      );
    }

    const liveStream = await this.twitchApi.getLiveStream(
      this.accessToken,
      this.broadcasterUserId,
    );

    if (!liveStream) {
      this.logger.log(
        'Twitch channel is currently offline',
      );
      return;
    }

    const activeStream =
      await this.streamsService.findActive();

    if (activeStream) {
      this.logger.log(
        `Active StreamOps stream already exists: ${activeStream.id}`,
      );
      return;
    }

    const stream = await this.streamsService.create({
      title: liveStream.title,
      startedAt: liveStream.started_at,
    });

    this.logger.log(
      `Recovered active StreamOps stream for existing Twitch broadcast: ${stream.id}`,
    );
  }

  private async handleMessage(
    message: TwitchEventSubMessage,
  ) {
    switch (
    message.metadata.message_type
    ) {
      case 'session_welcome':
        await this.handleWelcome(
          message.payload,
        );
        return;

      case 'session_keepalive':
        return;

      case 'notification':
        await this.handleNotification(
          message,
        );
        return;

      case 'session_reconnect':
        await this.handleReconnect(
          message.payload,
        );
        return;

      case 'revocation':
        this.logger.warn(
          'Twitch EventSub subscription revoked',
        );
        return;

      default:
        this.logger.debug(
          `Unknown Twitch EventSub message: ${message.metadata.message_type}`,
        );
    }
  }

  private async handleWelcome(
    payload: Record<string, unknown>,
  ) {
    const session =
      payload.session as TwitchSession;

    this.session = session;

    this.logger.log(
      `Twitch EventSub session established: ${session.id}`,
    );

    try {
      await this.syncCurrentStream();
    } catch (error) {
      this.logger.error(
        'Failed to sync current Twitch stream',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }

    await this.subscribe();
  }

  private async subscribe() {
    if (
      !this.accessToken ||
      !this.broadcasterUserId ||
      !this.session
    ) {
      throw new Error(
        'Twitch EventSub is not ready for subscription',
      );
    }

    const subscriptions: {
      type: string;
      version: string;
      condition: Record<string, string>;
    }[] = [
        {
          type: 'stream.online',
          version: '1',
          condition: {
            broadcaster_user_id:
              this.broadcasterUserId,
          },
        },
        {
          type: 'stream.offline',
          version: '1',
          condition: {
            broadcaster_user_id:
              this.broadcasterUserId,
          },
        },
        {
          type: 'channel.follow',
          version: '2',
          condition: {
            broadcaster_user_id:
              this.broadcasterUserId,
            moderator_user_id:
              this.broadcasterUserId,
          },
        },
        {
          type: 'channel.subscribe',
          version: '1',
          condition: {
            broadcaster_user_id:
              this.broadcasterUserId,
          },
        },
        {
          type: 'channel.cheer',
          version: '1',
          condition: {
            broadcaster_user_id:
              this.broadcasterUserId,
          },
        },
        {
          type:
            'channel.channel_points_custom_reward_redemption.add',
          version: '1',
          condition: {
            broadcaster_user_id:
              this.broadcasterUserId,
          },
        },
        {
          type: 'channel.chat.message',
          version: '1',
          condition: {
            broadcaster_user_id: this.broadcasterUserId,
            user_id: this.broadcasterUserId,
          },
        },
      ];

    for (const subscription of subscriptions) {
      try {
        const result =
          await this.twitchApi.createEventSubSubscription(
            this.accessToken,
            this.session.id,
            subscription.type,
            subscription.version,
            subscription.condition,
          );

        this.logger.log(
          `EventSub subscription accepted: ${subscription.type} v${subscription.version}`,
        );
      } catch (error) {
        this.logger.error(
          `EventSub subscription failed: ${subscription.type} v${subscription.version}`,
          error instanceof Error
            ? error.message
            : String(error),
        );
      }
    }
  }

  private async handleNotification(
    message: TwitchEventSubMessage,
  ) {
    const subscription =
      message.payload.subscription as
      | Record<string, unknown>
      | undefined;

    const event =
      message.payload.event as
      | Record<string, unknown>
      | undefined;

    if (!subscription || !event) {
      throw new Error(
        'Invalid Twitch EventSub notification payload',
      );
    }

    const subscriptionType =
      subscription.type;

    // this.logger.debug(
    //   `EventSub notification received: ${String(subscriptionType)}`,
    // );

    const normalized =
      this.normalizer.normalize(
        message.metadata.message_id,
        subscriptionType as string,
        event,
      );
    if (subscriptionType === 'channel.chat.message') {
      await this.chatOverlayService.addMessage(
        event,
        normalized.externalId,
      );
    }
    if (
      subscriptionType ===
      'stream.online'
    ) {
      await this.handleStreamOnline(
        normalized,
      );

      return;
    }

    if (
      subscriptionType ===
      'stream.offline'
    ) {
      await this.handleStreamOffline(
        normalized,
      );

      return;
    }

    if (
      subscriptionType ===
      'channel.channel_points_custom_reward_redemption.add'
    ) {
      await this.firstOverlayService.recordRedemption(event);
      await this.pointPoolService.recordRedemption(event);
    }

    const ingested = await this.ingestionService.ingest(
      normalized.type,
      normalized.externalId,
      normalized.payload,
    );

    if (subscriptionType === 'channel.chat.message') {
      // this.logger.log(
      //   `Chat message received; ingestion result: ${ingested ? 'accepted' : 'ignored'}`,
      // );

      if (ingested) {
        const reply =
          await this.chatCommandDispatcher.dispatch(
            normalized.payload,
            ingested.streamId,
          );

        // this.logger.log(
        //   `Chat command dispatch completed; reply: ${reply ? 'generated' : 'none'}`,
        // );

        if (reply && this.accessToken && this.broadcasterUserId) {
          await this.twitchApi.sendChatMessage(
            this.accessToken,
            this.broadcasterUserId,
            this.broadcasterUserId,
            reply,
          );
        }
      }

    }
  }

  private async handleReconnect(
    payload: Record<string, unknown>,
  ) {
    const session =
      payload.session as TwitchSession;

    if (!session.reconnect_url) {
      throw new Error(
        'Twitch requested reconnect without a reconnect URL',
      );
    }

    this.logger.log(
      'Reconnecting Twitch EventSub WebSocket',
    );

    this.socket?.close();

    await this.openSocket(
      session.reconnect_url,
    );
  }

  async onModuleDestroy() {
    this.socket?.close();
  }

  private async handleStreamOnline(
    event: {
      type: string;
      externalId: string;
      payload: Record<string, unknown>;
    },
  ) {
    const broadcasterUserId =
      event.payload.broadcaster_user_id;

    const broadcasterUserName =
      event.payload.broadcaster_user_name;

    const startedAt =
      event.payload.started_at;

    if (
      typeof broadcasterUserId !== 'string' ||
      typeof broadcasterUserName !== 'string' ||
      typeof startedAt !== 'string'
    ) {
      throw new Error(
        'Invalid Twitch stream.online payload',
      );
    }

    const stream =
      await this.streamsService.create({
        title: broadcasterUserName,
        startedAt,
      });

    await this.eventsService.create({
      streamId: stream.id,
      type: event.type,
      externalId: event.externalId,
      payload: event.payload,
    });
  }

  async findActive() {
    return this.prisma.stream.findFirst({
      where: {
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  async end(
    id: string,
    endedAt = new Date(),
  ) {
    return this.prisma.stream.update({
      where: { id },
      data: { endedAt },
    });
  }

  private async handleStreamOffline(
    event: {
      type: string;
      externalId: string;
      payload: Record<string, unknown>;
    },
  ) {
    const stream =
      await this.streamsService.findActive();

    if (!stream) {
      throw new Error(
        'Received Twitch stream.offline without an active StreamOps stream',
      );
    }

    await this.eventsService.create({
      streamId: stream.id,
      type: event.type,
      externalId: event.externalId,
      payload: event.payload,
    });

    await this.streamsService.end(
      stream.id,
    );
  }
}