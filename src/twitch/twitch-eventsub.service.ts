import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { TwitchApiClient } from './twitch-api.client.js';
import {
  TwitchEventSubMessage,
  TwitchSession,
} from './types/twitch-eventsub.types.js';

@Injectable()
export class TwitchEventSubService
  implements OnModuleDestroy
{
  private readonly logger =
    new Logger(TwitchEventSubService.name);

  private socket: WebSocket | null = null;
  private session: TwitchSession | null = null;

  private accessToken: string | null = null;
  private broadcasterUserId: string | null = null;

  constructor(
    private readonly twitchApi: TwitchApiClient,
    private readonly config: ConfigService,
  ) {}

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

    const subscriptions: Array<{
      type: string;
      version: string;
      condition: Record<string, string>;
    }> = [
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
    ];

    for (const subscription of subscriptions) {
      await this.twitchApi.createEventSubSubscription(
        this.accessToken,
        this.session.id,
        subscription.type,
        subscription.version,
        subscription.condition,
      );
    }
  }

  private async handleNotification(
    message: TwitchEventSubMessage,
  ) {
    this.logger.log(
      `Received Twitch event: ${message.metadata.message_type}`,
    );

    this.logger.debug(
      JSON.stringify(message.payload),
    );
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
}