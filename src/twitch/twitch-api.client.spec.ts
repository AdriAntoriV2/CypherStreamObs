import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { TwitchApiClient } from './twitch-api.client.js';

describe('TwitchApiClient', () => {
    let client: TwitchApiClient;
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        const values: Record<string, string> = {
            'twitch.clientId': 'test-client-id',
            'twitch.clientSecret': 'test-client-secret',
            'twitch.redirectUri': 'http://localhost:3000/callback',
        };

        const config = {
            get: vi.fn((key: string) => values[key]),
            getOrThrow: vi.fn((key: string) => {
                const value = values[key];

                if (value === undefined) {
                    throw new Error(`Missing config: ${key}`);
                }

                return value;
            }),
        };

        client = new TwitchApiClient(config as unknown as ConfigService);
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('accepts a successfully sent message', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    data: [{ is_sent: true, message_id: 'message-123' }],
                }),
                { status: 200 },
            ),
        );

        await expect(
            client.sendChatMessage(
                'test-token',
                'broadcaster-123',
                'sender-123',
                'Hello chat!',
            ),
        ).resolves.toBeUndefined();

        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://api.twitch.tv/helix/chat/messages',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token',
                    'Client-Id': 'test-client-id',
                }),
                body: JSON.stringify({
                    broadcaster_id: 'broadcaster-123',
                    sender_id: 'sender-123',
                    message: 'Hello chat!',
                }),
            }),
        );
    });

    it('throws when Twitch rejects delivery', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    data: [
                        {
                            is_sent: false,
                            drop_reason: {
                                code: 'message_rejected',
                                message: 'Message was rejected',
                            },
                        },
                    ],
                }),
                { status: 200 },
            ),
        );

        await expect(
            client.sendChatMessage(
                'test-token',
                'broadcaster-123',
                'sender-123',
                'Hello chat!',
            ),
        ).rejects.toThrow(
            'Twitch did not send the chat message: message_rejected: Message was rejected',
        );
    });

    it('throws when the HTTP request fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response('Unauthorized', { status: 401 }),
        );

        await expect(
            client.sendChatMessage(
                'expired-token',
                'broadcaster-123',
                'sender-123',
                'Hello chat!',
            ),
        ).rejects.toThrow('Twitch chat message failed: 401 Unauthorized');
    });

    it('throws when Twitch returns invalid JSON', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response('not-json', { status: 200 }),
        );

        await expect(
            client.sendChatMessage(
                'test-token',
                'broadcaster-123',
                'sender-123',
                'Hello chat!',
            ),
        ).rejects.toThrow(
            'Twitch chat message returned an invalid JSON response',
        );
    });

    it('throws when the response has no delivery result', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 }),
        );

        await expect(
            client.sendChatMessage(
                'test-token',
                'broadcaster-123',
                'sender-123',
                'Hello chat!',
            ),
        ).rejects.toThrow(
            'Twitch chat message returned an unexpected response',
        );
    });
});