
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
                'Adds a test event to the BullMQ events queue. A successful response confirms that the job was queued, not that processing has completed.',
        }),
        ApiResponse({
            status: 201,
            description: 'The test event was queued successfully.',
            schema: {
                type: 'object',
                properties: {
                    queued: {
                        type: 'boolean',
                        example: true,
                    },
                    jobId: {
                        type: 'string',
                        nullable: true,
                        example: '42',
                        description:
                            'BullMQ job ID. May be null if the queue does not return an ID.',
                    },
                },
                required: ['queued', 'jobId'],
                example: {
                    queued: true,
                    jobId: '42',
                },
            },
        }),
        ApiResponse({
            status: 500,
            description:
                'The job could not be added to the queue, for example due to a Redis connection failure.',
            schema: {
                type: 'object',
                example: {
                    statusCode: 500,
                    message: 'Internal server error',
                },
            },
        }),
    );
