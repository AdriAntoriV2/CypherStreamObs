
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SecretEncryptionService } from '../common/security/secret-encryption.service.js';
import { TwitchApiClient } from './twitch-api.client.js';
import { TwitchAuthenticatedClient } from './twitch-authenticated.client.js';
import { TwitchEventSubService } from './twitch-eventsub.service.js';
import { TwitchOAuthStateService } from './twitch-oauth-state.service.js';

@Injectable()
export class TwitchService implements OnModuleInit {
  private readonly logger = new Logger(TwitchService.name);

  constructor(
    private readonly twitchApi: TwitchApiClient,
    private readonly authenticatedClient: TwitchAuthenticatedClient,
    private readonly eventSub: TwitchEventSubService,
    private readonly prisma: PrismaService,
    private readonly encryption: SecretEncryptionService,
    private readonly oauthState: TwitchOAuthStateService,
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
}
