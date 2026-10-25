
import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

export const ApiQueueControllerDocs = () =>
    applyDecorators(
        ApiTags('Queue'),
    );

export const ApiTestQueue = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Queue a test event',
            description:
                'Queue processing is temporarily disabled. Requests are rejected until the queue is re-enabled.',
        }),
        ApiResponse({
            status: 503,
            description: 'Queue processing is temporarily unavailable.',
            schema: {
                type: 'object',
                example: {
                    statusCode: 503,
                    message: 'Queue processing is temporarily disabled.',
                },
            },
        }),
    );
