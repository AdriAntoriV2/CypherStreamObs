import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SecretEncryptionService } from '../common/security/secret-encryption.service.js';
import { TwitchApiClient } from './twitch-api.client.js';
import { ConfigService } from '@nestjs/config';

interface TwitchAccountTokens {
    id: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    accessTokenExpiresAt: Date;
    tokenVersion: number;
}

interface TwitchApiRequestOptions
    extends RequestInit {
    retryOnUnauthorized?: boolean;
}

@Injectable()
export class TwitchAuthenticatedClient {
    private readonly refreshes =
        new Map<string, Promise<string>>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: SecretEncryptionService,
        private readonly twitchApi: TwitchApiClient,
        private readonly config: ConfigService,
    ) { }

    async request(
        accountId: string,
        url: string,
        options: TwitchApiRequestOptions = {},
    ): Promise<Response> {

        const TOKEN_REFRESH_BUFFER_MS =
            60 * 1_000;

        const account =
            await this.getAccountTokens(accountId);

        const tokenExpiresSoon =
            account.accessTokenExpiresAt.getTime() -
            Date.now() <=
            TOKEN_REFRESH_BUFFER_MS;

        const accessToken =
            tokenExpiresSoon
                ? await this.refresh(account)
                : this.encryption.decrypt(
                    account.accessTokenEncrypted,
                );

        const response =
            await this.send(
                url,
                accessToken,
                options,
            );

        if (
            response.status !== 401 ||
            options.retryOnUnauthorized === false
        ) {
            return response;
        }

        const refreshedToken =
            await this.refresh(account);

        return this.send(
            url,
            refreshedToken,
            {
                ...options,
                retryOnUnauthorized: false,
            },
        );
    }

    private async send(
        url: string,
        accessToken: string,
        options: TwitchApiRequestOptions,
    ): Promise<Response> {
        const {
            retryOnUnauthorized: _retryOnUnauthorized,
            ...requestOptions
        } = options;

        const headers = new Headers(
            requestOptions.headers,
        );

        headers.set(
            'Authorization',
            `Bearer ${accessToken}`,
        );

        headers.set(
            'Client-Id',
            this.getClientId(),
        );

        return fetch(url, {
            ...requestOptions,
            headers,
        });
    }

    private getClientId(): string {
        return this.config.getOrThrow<string>(
            'twitch.clientId',
        );
    }

    private async getAccountTokens(
        accountId: string,
    ): Promise<TwitchAccountTokens> {
        const account =
            await this.prisma.twitchAccount.findUnique({
                where: {
                    id: accountId,
                },
                select: {
                    id: true,
                    accessTokenEncrypted: true,
                    refreshTokenEncrypted: true,
                    accessTokenExpiresAt: true,
                    tokenVersion: true,
                },
            });

        if (!account) {
            throw new UnauthorizedException(
                'Twitch account not found',
            );
        }

        return account;
    }

    private async refresh(
        account: TwitchAccountTokens,
    ): Promise<string> {
        const existing =
            this.refreshes.get(account.id);

        if (existing) {
            return existing;
        }

        const promise =
            this.performRefresh(account);

        this.refreshes.set(
            account.id,
            promise,
        );

        try {
            return await promise;
        } finally {
            this.refreshes.delete(account.id);
        }
    }

    private async performRefresh(
        account: TwitchAccountTokens & {
            tokenVersion: number;
        },
    ): Promise<string> {
        const refreshToken =
            this.encryption.decrypt(
                account.refreshTokenEncrypted,
            );

        const token =
            await this.twitchApi.refreshAccessToken(
                refreshToken,
            );

        if (!token.refresh_token) {
            throw new Error(
                'Twitch token refresh did not return a refresh token',
            );
        }

        const accessTokenEncrypted =
            this.encryption.encrypt(
                token.access_token,
            );

        const refreshTokenEncrypted =
            this.encryption.encrypt(
                token.refresh_token,
            );

        const accessTokenExpiresAt =
            new Date(
                Date.now() +
                token.expires_in * 1_000,
            );

        const result =
            await this.prisma.twitchAccount.updateMany({
                where: {
                    id: account.id,
                    tokenVersion: account.tokenVersion,
                },
                data: {
                    accessTokenEncrypted,
                    refreshTokenEncrypted,
                    accessTokenExpiresAt,
                    scopes: token.scope,
                    tokenVersion: {
                        increment: 1,
                    },
                },
            });

        if (result.count !== 1) {
            const current =
                await this.prisma.twitchAccount.findUnique({
                    where: {
                        id: account.id,
                    },
                    select: {
                        accessTokenEncrypted: true,
                    },
                });

            if (!current) {
                throw new UnauthorizedException(
                    'Twitch account no longer exists',
                );
            }

            return this.encryption.decrypt(
                current.accessTokenEncrypted,
            );
        }

        return token.access_token;
    }

    async getUser(
        accountId: string,
    ) {
        const response =
            await this.request(
                accountId,
                'https://api.twitch.tv/helix/users',
            );

        if (!response.ok) {
            if (response.status === 401) {
                throw new UnauthorizedException(
                    'Twitch authorization is no longer valid',
                );
            }

            const body =
                await response.text();

            throw new Error(
                `Twitch API request failed: ${response.status} ${body}`,
            );
        }

        return response.json();
    }

}