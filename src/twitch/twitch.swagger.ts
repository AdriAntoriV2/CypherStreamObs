import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

export const ApiTwitchControllerDocs = () =>
    applyDecorators(ApiTags('Twitch'));

export const ApiTwitchOAuth = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Start Twitch OAuth authorization',
            description:
                'Creates an OAuth state value, saves it in the current session, and redirects the browser to Twitch for authorization. After authorization, Twitch redirects the browser to the callback endpoint.',
        }),
        ApiResponse({
            status: 302,
            description: 'Redirects the browser to Twitch authorization.',
            headers: {
                Location: {
                    description: 'Twitch authorization URL.',
                    schema: {
                        type: 'string',
                        example:
                            'https://id.twitch.tv/oauth2/authorize?client_id=example',
                    },
                },
            },
        }),
        ApiResponse({
            status: 500,
            description:
                'The session could not be saved or the authorization URL could not be generated.',
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

export const ApiTwitchOAuthCallback = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Complete Twitch OAuth authorization',
            description:
                'Validates the OAuth state against the initiating session, exchanges the authorization code, saves the connected Twitch account, starts EventSub, regenerates the session to prevent session fixation, and saves the authenticated Twitch user ID in the new session.',
        }),
        ApiQuery({
            name: 'code',
            required: true,
            type: String,
            description: 'Authorization code supplied by Twitch.',
            example: 'authorization-code-example',
        }),
        ApiQuery({
            name: 'state',
            required: true,
            type: String,
            description:
                'OAuth state returned by Twitch. Must match the state saved in the initiating session.',
            example: 'oauth-state-example',
        }),
        ApiResponse({
            status: 200,
            description: 'Twitch account connected successfully.',
            content: {
                'application/json': {
                    example: {
                        id: 'account-123',
                        twitchUserId: '123456789',
                        login: 'cypherusuh',
                        displayName: 'Cypherusuh',
                        scopes: [
                            'user:read:chat',
                            'channel:read:redemptions',
                        ],
                        connectedAt: '2026-10-17T03:15:00.000Z',
                    },
                },
            },
        }),
        ApiResponse({
            status: 400,
            description: 'The authorization code or state is missing.',
            content: {
                'application/json': {
                    example: {
                        statusCode: 400,
                        message: 'Missing Twitch OAuth code or state',
                        error: 'Bad Request',
                    },
                },
            },
        }),
        ApiResponse({
            status: 401,
            description:
                'The OAuth state is invalid, expired, or does not match the initiating session.',
            content: {
                'application/json': {
                    example: {
                        statusCode: 401,
                        message:
                            'OAuth state does not match the initiating session',
                        error: 'Unauthorized',
                    },
                },
            },
        }),
        ApiResponse({
            status: 500,
            description:
                'The token exchange, account persistence, session regeneration, or another unexpected operation failed.',
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

export const ApiTwitchLogout = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Disconnect the current session',
            description:
                'Destroys the current session and clears the streamops.sid cookie. This endpoint does not delete the saved Twitch account or revoke its Twitch authorization.',
        }),
        ApiResponse({
            status: 204,
            description:
                'Session destroyed and session cookie cleared. No response body.',
        }),
        ApiResponse({
            status: 500,
            description:
                'The session could not be destroyed.',
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