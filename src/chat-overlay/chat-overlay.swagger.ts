
import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

const messageExample = {
    id: 'message-123',
    username: 'Viewer123',
    text: 'Hello cypher! Kappa',
    color: '#42C8FF',
    timestamp: '2026-10-17T03:15:00.000Z',
    fragments: [
        {
            type: 'text',
            text: 'Hello cypher! ',
        },
        {
            type: 'emote',
            text: 'Kappa',
            emoteId: '25',
            emoteFormat: 'static',
        },
    ],
};

export const ApiChatOverlayControllerDocs = () =>
    applyDecorators(
        ApiTags('Chat Overlay'),
    );

export const ApiGetRecentChatMessages = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get recent chat messages',
            description:
                'Returns cached Twitch chat messages, newest first. Each message includes its author, text, timestamp, optional username color, and text/emote fragments for rendering in the OBS browser overlay. The number of messages and their retention period are configurable.',
        }),
        ApiResponse({
            status: 200,
            description:
                'Recent chat messages, ordered newest first. Returns an empty array when no messages are cached.',
            content: {
                'application/json': {
                    examples: {
                        messagesAvailable: {
                            summary: 'Recent messages available',
                            value: [
                                messageExample,
                                {
                                    ...messageExample,
                                    id: 'message-122',
                                    username: 'AnotherViewer',
                                    text: 'Hello chat!',
                                    color: null,
                                    timestamp: '2026-10-17T03:14:50.000Z',
                                    fragments: [
                                        {
                                            type: 'text',
                                            text: 'Hello chat!',
                                        },
                                    ],
                                },
                            ],
                        },
                        noMessages: {
                            summary: 'No cached messages',
                            value: [],
                        },
                    },
                },
            },
        }),
        ApiResponse({
            status: 500,
            description:
                'The chat message cache could not be read, for example due to a Redis connection failure or invalid cached JSON.',
            content: {
                'application/json': {
                    example: {
                        statusCode: 500,
                        message: 'Internal server error',
                    },
                },
            },
        }),
    );
