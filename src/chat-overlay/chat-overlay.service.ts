import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

export interface ChatOverlayFragment {
    type: 'text' | 'emote';
    text: string;
    emoteId?: string;
    emoteFormat?: 'static' | 'animated';
}

export interface ChatOverlayMessage {
    id: string;
    username: string;
    text: string;
    color: string | null;
    timestamp: string;
    fragments: ChatOverlayFragment[];
}

interface CachedTwitchEmote {
    id: string;
    format: 'static' | 'animated';
}

@Injectable()
export class ChatOverlayService
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ChatOverlayService.name);
    private readonly redis;

    private readonly listKey = 'streamops:chat-overlay:messages';
    private readonly emoteMapKey = 'streamops:chat-overlay:emotes';

    private readonly emoteMap = new Map<string, CachedTwitchEmote>();

    constructor(private readonly config: ConfigService) {
        this.redis = createClient({
            url: this.config.getOrThrow<string>('redis.url'),
        });

        this.redis.on('error', (error) => {
            this.logger.error('Chat overlay Redis error', error);
        });
    }

    async onModuleInit(): Promise<void> {
        await this.redis.connect();

        const cached = await this.redis.get(this.emoteMapKey);

        if (cached) {
            try {
                const entries = JSON.parse(cached) as Record<
                    string,
                    CachedTwitchEmote
                >;

                for (const [name, emote] of Object.entries(entries)) {
                    if (
                        typeof emote.id === 'string' &&
                        /^\d+$/.test(emote.id)
                    ) {
                        this.emoteMap.set(name, emote);
                    }
                }

                this.logger.log(
                    `Loaded ${this.emoteMap.size} cached Twitch emotes`,
                );
            } catch {
                this.logger.warn('Ignoring invalid cached Twitch emotes');
            }
        }

        this.logger.log('Chat overlay Redis connection established');
    }

    async onModuleDestroy(): Promise<void> {
        if (this.redis.isOpen) {
            await this.redis.close();
        }
    }

    async setEmoteMap(
        emotes: Record<string, CachedTwitchEmote>,
    ): Promise<void> {
        this.emoteMap.clear();

        for (const [name, emote] of Object.entries(emotes)) {
            this.emoteMap.set(name, emote);
        }

        await this.redis.set(
            this.emoteMapKey,
            JSON.stringify(emotes),
        );

        this.logger.log(
            `Cached ${this.emoteMap.size} Twitch channel emotes`,
        );
        this.logger.log(
            JSON.stringify({
                DinoDance: this.emoteMap.get('DinoDance'),
                cypher151Kaitoball: this.emoteMap.get('cypher151Kaitoball'),
                totalCached: this.emoteMap.size,
            }),
        );
    }

    private resolveTextFragment(
        text: string,
    ): ChatOverlayFragment[] {
        return text.split(/(\s+)/).flatMap((part) => {
            if (!part || /^\s+$/.test(part)) {
                return part ? [{ type: 'text' as const, text: part }] : [];
            }

            const match = part.match(
                /^([^A-Za-z0-9_]*)([A-Za-z0-9_]+)([^A-Za-z0-9_]*)$/,
            );

            if (!match) {
                return [{ type: 'text' as const, text: part }];
            }

            const [, prefix, name, suffix] = match;
            const emote = this.emoteMap.get(name);

            if (!emote) {
                return [{ type: 'text' as const, text: part }];
            }

            const result: ChatOverlayFragment[] = [];

            if (prefix) {
                result.push({ type: 'text', text: prefix });
            }

            result.push({
                type: 'emote',
                text: name,
                emoteId: emote.id,
                emoteFormat: emote.format,
            });

            if (suffix) {
                result.push({ type: 'text', text: suffix });
            }

            return result;
        });
    }

    async addMessage(
        event: Record<string, unknown>,
        fallbackId: string,
    ): Promise<void> {
        const message = event.message;

        if (
            typeof message !== 'object' ||
            message === null ||
            !('text' in message)
        ) {
            this.logger.warn('Ignoring chat event with an invalid message');
            return;
        }

        const chatMessage = message as Record<string, unknown>;

        if (typeof chatMessage.text !== 'string') {
            this.logger.warn('Ignoring chat event with an invalid message');
            return;
        }
        const username =
            typeof event.chatter_user_name === 'string'
                ? event.chatter_user_name
                : typeof event.chatter_user_login === 'string'
                    ? event.chatter_user_login
                    : 'Unknown';

        const fragments: ChatOverlayFragment[] = [];
        const rawFragments = chatMessage.fragments;

        if (Array.isArray(rawFragments)) {
            for (const rawFragment of rawFragments) {
                if (
                    typeof rawFragment !== 'object' ||
                    rawFragment === null
                ) {
                    continue;
                }

                const fragment = rawFragment as Record<string, unknown>;
                const fragmentText =
                    typeof fragment.text === 'string' ? fragment.text : '';

                if (
                    fragment.type === 'emote' &&
                    typeof fragment.emote === 'object' &&
                    fragment.emote !== null
                ) {
                    const emote = fragment.emote as Record<string, unknown>;

                    if (
                        typeof emote.id === 'string' &&
                        /^\d+$/.test(emote.id)
                    ) {
                        const formats = Array.isArray(emote.format)
                            ? emote.format.filter(
                                (format): format is string =>
                                    typeof format === 'string',
                            )
                            : [];

                        fragments.push({
                            type: 'emote',
                            text: fragmentText,
                            emoteId: emote.id,
                            emoteFormat: formats.includes('animated')
                                ? 'animated'
                                : 'static',
                        });

                        continue;
                    }
                }

                if (fragmentText) {
                    fragments.push({
                        type: 'text',
                        text: fragmentText,
                    });
                }
            }
        }

        // Compatibility fallback for payloads without fragments.
        if (fragments.length === 0) {
            fragments.push({
                type: 'text',
                text: chatMessage.text,
            });
        }

        const resolvedFragments = fragments.flatMap((fragment) =>
            fragment.type === 'text'
                ? this.resolveTextFragment(fragment.text)
                : [fragment],
        );

        const entry: ChatOverlayMessage = {
            id:
                typeof chatMessage.message_id === 'string'
                    ? chatMessage.message_id
                    : fallbackId,
            username,
            text: chatMessage.text,
            fragments: resolvedFragments,
            color:
                typeof event.color === 'string' && event.color.length > 0
                    ? event.color
                    : null,
            timestamp: new Date().toISOString(),
        };

        const maxMessages =
            this.config.getOrThrow<number>('chatOverlay.maxMessages');

        const ttlSeconds =
            this.config.getOrThrow<number>(
                'chatOverlay.messageTtlSeconds',
            );

        try {
            await this.redis
                .multi()
                .lPush(this.listKey, JSON.stringify(entry))
                .lTrim(this.listKey, 0, maxMessages - 1)
                .expire(this.listKey, ttlSeconds)
                .exec();
        } catch (error) {
            // Chat display must not break Twitch event ingestion or commands.
            this.logger.error(
                'Failed to store chat overlay message',
                error instanceof Error ? error.stack : String(error),
            );
        }
    }

    async getRecentMessages(): Promise<ChatOverlayMessage[]> {
        const entries = await this.redis.lRange(this.listKey, 0, -1);

        return entries.map((entry) => JSON.parse(entry) as ChatOverlayMessage);
    }
} 