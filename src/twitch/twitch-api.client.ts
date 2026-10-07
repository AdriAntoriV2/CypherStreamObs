import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TwitchTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string[];
    token_type: string;
}

interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
}

@Injectable()
export class TwitchApiClient {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;

    constructor(
        private readonly config: ConfigService,
    ) {
        this.clientId =
            this.config.getOrThrow<string>(
                'twitch.clientId',
            );

        this.clientSecret =
            this.config.getOrThrow<string>(
                'twitch.clientSecret',
            );

        this.redirectUri =
            this.config.getOrThrow<string>(
                'twitch.redirectUri',
            );
    }

    getAuthorizationUrl(
        state: string,
    ): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: [
                'user:read:chat',
                'user:write:chat',
            ].join(' '),
            state,
        });

        return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    }

    async exchangeCode(code: string) {
        const response =
            await fetch(
                'https://id.twitch.tv/oauth2/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        code,
                        grant_type: 'authorization_code',
                        redirect_uri: this.redirectUri,
                    }),
                },
            );

        if (!response.ok) {
            throw new Error(
                `Twitch OAuth token exchange failed: ${response.status}`,
            );
        }

        return response.json() as Promise<TwitchTokenResponse>;
    }

    async getUser(accessToken: string) {
        const response =
            await fetch(
                'https://api.twitch.tv/helix/users',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Client-Id': this.clientId,
                    },
                },
            );

        if (!response.ok) {
            throw new Error(
                `Twitch user request failed: ${response.status}`,
            );
        }

        const body =
            (await response.json()) as {
                data: TwitchUser[];
            };

        return body.data[0] ?? null;
    }

    async createEventSubSubscription(
        accessToken: string,
        sessionId: string,
        type: string,
        version: string,
        condition: Record<string, string>,
    ) {
        const response =
            await fetch(
                'https://api.twitch.tv/helix/eventsub/subscriptions',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Client-Id': this.clientId,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type,
                        version,
                        condition,
                        transport: {
                            method: 'websocket',
                            session_id: sessionId,
                        },
                    }),
                },
            );

        if (!response.ok) {
            const body = await response.text();

            throw new Error(
                `Twitch EventSub subscription failed: ${response.status} ${body}`,
            );
        }

        return response.json();
    }

    async refreshAccessToken(
        refreshToken: string,
    ) {
        const response = await fetch(
            'https://id.twitch.tv/oauth2/token',
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            },
        );

        if (!response.ok) {
            const body = await response.text();

            throw new Error(
                `Twitch OAuth token refresh failed: ${response.status} ${body}`,
            );
        }

        return response.json() as Promise<TwitchTokenResponse>;
    }
}