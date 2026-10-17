
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SecretEncryptionService } from '../common/security/secret-encryption.service.js';
import { TwitchApiClient } from './twitch-api.client.js';
import { TwitchAuthenticatedClient } from './twitch-authenticated.client.js';
import { TwitchEventSubService } from './twitch-eventsub.service.js';
import { TwitchOAuthStateService } from './twitch-oauth-state.service.js';
import { TwitchShoutoutInfo } from './types/twitch-eventsub.types.js';
import { ChatOverlayService } from '../chat-overlay/chat-overlay.service.js';

@Injectable()
export class TwitchService implements OnModuleInit {
  private readonly logger = new Logger(TwitchService.name);
  emoteMap: any;

  constructor(
    private readonly twitchApi: TwitchApiClient,
    private readonly authenticatedClient: TwitchAuthenticatedClient,
    private readonly eventSub: TwitchEventSubService,
    private readonly prisma: PrismaService,
    private readonly encryption: SecretEncryptionService,
    private readonly oauthState: TwitchOAuthStateService,
    private readonly chatOverlay: ChatOverlayService,
  ) { }

  async onModuleInit(): Promise<void> {
    const account = await this.prisma.twitchAccount.findFirst({
      orderBy: {
        connectedAt: 'desc',
      },
      select: {
        id: true,
        twitchUserId: true,
        login: true,
      },
    });

    if (!account) {
      this.logger.log(
        'No saved Twitch account found; browser authorization is required for the first connection.',
      );
      return;
    }

    try {
      // Validate the saved authorization and refresh if necessary.
      await this.authenticatedClient.getUser(account.id);

      const accessToken =
        await this.authenticatedClient.getAccessToken(account.id);

      await this.refreshChatEmotes(
        account.id,
        account.twitchUserId,
      );

      await this.eventSub.connect(
        accessToken,
        account.twitchUserId,
      );

      this.logger.log(
        `Twitch startup reconnection initiated for ${account.login}.`,
      );
    } catch (error) {
      this.logger.error(
        `Automatic Twitch reconnection failed for ${account.login}. Reauthorization may be required.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async getAuthorizationUrl(): Promise<{ url: string; state: string }> {
    const state = await this.oauthState.create();
    const url = this.twitchApi.getAuthorizationUrl(state);

    return { url, state };
  }

  async handleOAuthCallback(code: string, state: string) {
    if (!code || !state) {
      throw new BadRequestException(
        'Missing Twitch OAuth code or state',
      );
    }

    const validState = await this.oauthState.consume(state);

    if (!validState) {
      throw new UnauthorizedException(
        'Invalid or expired Twitch OAuth state',
      );
    }

    const token = await this.twitchApi.exchangeCode(code);

    if (!token.refresh_token) {
      throw new Error(
        'Twitch OAuth did not return a refresh token',
      );
    }

    const user = await this.twitchApi.getUser(token.access_token);

    if (!user) {
      throw new Error(
        'Twitch OAuth did not return a user',
      );
    }

    const accessTokenEncrypted = this.encryption.encrypt(
      token.access_token,
    );

    const refreshTokenEncrypted = this.encryption.encrypt(
      token.refresh_token,
    );

    const accessTokenExpiresAt = new Date(
      Date.now() + token.expires_in * 1_000,
    );

    const account = await this.prisma.twitchAccount.upsert({
      where: {
        twitchUserId: user.id,
      },
      create: {
        twitchUserId: user.id,
        login: user.login,
        displayName: user.display_name,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiresAt,
        scopes: token.scope,
      },
      update: {
        login: user.login,
        displayName: user.display_name,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiresAt,
        scopes: token.scope,
        tokenVersion: {
          increment: 1,
        },
      },
    });

    await this.refreshChatEmotes(
      account.id,
      account.twitchUserId,
    );

    await this.eventSub.connect(
      token.access_token,
      user.id,
    );

    return {
      id: account.id,
      twitchUserId: account.twitchUserId,
      login: account.login,
      displayName: account.displayName,
      scopes: account.scopes,
      connectedAt: account.connectedAt,
    };
  }

  async getShoutoutInfo(
    username: string,
  ): Promise<TwitchShoutoutInfo | null> {
    const account = await this.prisma.twitchAccount.findFirst({
      orderBy: {
        connectedAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      throw new ServiceUnavailableException(
        'Twitch is not connected.',
      );
    }

    return this.authenticatedClient.getShoutoutInfo(
      account.id,
      username,
    );
  }


  private async refreshChatEmotes(
    accountId: string,
    broadcasterId: string,
  ): Promise<void> {
    this.logger.log(
      `Refreshing chat emotes for broadcaster ${broadcasterId}`,
    );

    type TwitchEmote = {
      id: string;
      name: string;
      format: string[];
    };

    const fetchEmotes = async (
      endpoint: string,
    ): Promise<TwitchEmote[]> => {
      const results: TwitchEmote[] = [];
      let cursor: string | undefined;

      try {
        do {
          const url = new URL(endpoint);

          if (cursor) {
            url.searchParams.set('after', cursor);
          }

          const response = await this.authenticatedClient.request(
            accountId,
            url.toString(),
          );

          if (!response.ok) {
            this.logger.warn(
              `Twitch emote lookup failed: HTTP ${response.status}`,
            );
            break;
          }

          const body = (await response.json()) as {
            data?: Array<{
              id?: string;
              name?: string;
              format?: string[];
            }>;
            pagination?: {
              cursor?: string;
            };
          };

          for (const emote of body.data ?? []) {
            if (
              typeof emote.id !== 'string' ||
              emote.id.length === 0 ||
              typeof emote.name !== 'string' ||
              emote.name.length === 0
            ) {
              continue;
            }

            results.push({
              id: emote.id,
              name: emote.name,
              format: Array.isArray(emote.format)
                ? emote.format
                : ['static'],
            });
          }

          cursor = body.pagination?.cursor;
        } while (cursor);
      } catch (error) {
        this.logger.warn(
          `Twitch emote lookup failed: ${error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      return results;
    };

    const channelUrl = new URL(
      'https://api.twitch.tv/helix/chat/emotes',
    );
    channelUrl.searchParams.set('broadcaster_id', broadcasterId);

    const [globalEmotes, channelEmotes] = await Promise.all([
      fetchEmotes(
        'https://api.twitch.tv/helix/chat/emotes/global',
      ),
      fetchEmotes(channelUrl.toString()),
    ]);

    this.logger.log(
      `Emote API results: global=${globalEmotes.length}, channel=${channelEmotes.length}, ` +
      `DinoDance global=${globalEmotes.some((emote) => emote.name === 'DinoDance')}, ` +
      `cypher151Kaitoball channel=${channelEmotes.some((emote) => emote.name === 'cypher151Kaitoball')}`,
    );

    const emotes: Record<
      string,
      { id: string; format: 'static' | 'animated' }
    > = {};

    for (const emote of globalEmotes) {
      emotes[emote.name] = {
        id: emote.id,
        format: emote.format.includes('animated')
          ? 'animated'
          : 'static',
      };
    }

    // Channel emotes override global entries if names collide.
    for (const emote of channelEmotes) {
      emotes[emote.name] = {
        id: emote.id,
        format: emote.format.includes('animated')
          ? 'animated'
          : 'static',
      };
    }

    if (globalEmotes.length === 0 && channelEmotes.length === 0) {
      this.logger.warn(
        'No Twitch emotes were loaded; keeping the existing cache',
      );
      return;
    }

    await this.chatOverlay.setEmoteMap(emotes);

    this.logger.log(
      `Loaded ${globalEmotes.length} global and ${channelEmotes.length} channel emotes`,
    );
  }
  async getAccountIdentity(twitchUserId: string) {
    const account = await this.prisma.twitchAccount.findUnique({
      where: { twitchUserId },
      select: {
        twitchUserId: true,
        login: true,
        displayName: true,
      },
    });

    if (!account) {
      throw new UnauthorizedException(
        'The authenticated Twitch account was not found.',
      );
    }

    return {
      id: account.twitchUserId,
      login: account.login,
      displayName: account.displayName,
    };
  }

}
