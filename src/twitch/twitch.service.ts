import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SecretEncryptionService } from '../common/security/secret-encryption.service.js';
import { TwitchApiClient } from './twitch-api.client.js';
import { TwitchEventSubService } from './twitch-eventsub.service.js';
import { TwitchOAuthStateService } from './twitch-oauth-state.service.js';

@Injectable()
export class TwitchService {
  constructor(
    private readonly twitchApi:
      TwitchApiClient,

    private readonly eventSub:
      TwitchEventSubService,

    private readonly prisma:
      PrismaService,

    private readonly encryption:
      SecretEncryptionService,

    private readonly oauthState:
      TwitchOAuthStateService,
  ) {}

  async getAuthorizationUrl() {
    const state =
      await this.oauthState.create();

    return this.twitchApi
      .getAuthorizationUrl(state);
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ) {
    const valid =
      await this.oauthState.consume(
        state,
      );

    if (!valid) {
      throw new UnauthorizedException(
        'Invalid or expired Twitch OAuth state',
      );
    }

    const token =
      await this.twitchApi.exchangeCode(
        code,
      );

    const user =
      await this.twitchApi.getUser(
        token.access_token,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Unable to identify Twitch account',
      );
    }

    const accessTokenEncrypted =
      this.encryption.encrypt(
        token.access_token,
      );

    const refreshToken =
      token.refresh_token;

    if (!refreshToken) {
      throw new Error(
        'Twitch did not return a refresh token',
      );
    }

    const refreshTokenEncrypted =
      this.encryption.encrypt(
        refreshToken,
      );

    const accessTokenExpiresAt =
      new Date(
        Date.now() +
          token.expires_in * 1000,
      );

    const account =
      await this.prisma.twitchAccount.upsert({
        where: {
          twitchUserId: user.id,
        },
        create: {
          twitchUserId: user.id,
          login: user.login,
          displayName:
            user.display_name,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          accessTokenExpiresAt,
          scopes: token.scope,
        },
        update: {
          login: user.login,
          displayName:
            user.display_name,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          accessTokenExpiresAt,
          scopes: token.scope,
        },
      });

    await this.eventSub.connect(
      token.access_token,
      user.id,
    );

    return {
      id: account.id,
      twitchUserId:
        account.twitchUserId,
      login: account.login,
      displayName:
        account.displayName,
      scopes: account.scopes,
      connectedAt:
        account.connectedAt,
    };
  }
}