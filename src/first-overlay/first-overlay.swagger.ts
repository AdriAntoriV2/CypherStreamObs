
import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

export const ApiFirstOverlayControllerDocs = () =>
    applyDecorators(
        ApiTags('First Overlay'),
    );

export const ApiGetCurrentFirstOverlayState = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get current First redemption overlay state',
            description:
                'Returns the active stream status, elapsed time in milliseconds, and the winning First redemption if one exists. Intended for polling by the OBS browser overlay.',
        }),
        ApiResponse({
            status: 200,
            description:
                'Current overlay state. When no stream is active, active is false. When a stream is active but has no winner, winner is null and elapsedMs continues increasing. Once a winner exists, elapsedMs represents the time between the stream start and the winning redemption.',
            content: {
                'application/json': {
                    examples: {
                        noActiveStream: {
                            summary: 'No active stream',
                            value: {
                                active: false,
                                elapsedMs: 0,
                                winner: null,
                            },
                        },
                        waitingForFirst: {
                            summary: 'Stream is active, waiting for a winner',
                            value: {
                                active: true,
                                elapsedMs: 12543,
                                winner: null,
                            },
                        },
                        winnerFound: {
                            summary: 'First redemption winner found',
                            value: {
                                active: true,
                                elapsedMs: 12543,
                                winner: {
                                    displayName: 'Viewer123',
                                    elapsedMs: 12543,
                                },
                            },
                        },
                    },
                },
            },
        }),
        ApiResponse({
            status: 500,
            description: 'The overlay state could not be retrieved.',
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
