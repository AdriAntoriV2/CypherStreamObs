
import { applyDecorators } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

export const ApiHealthControllerDocs = () =>
    applyDecorators(ApiTags('Health'));

export const ApiCheckHealth = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Check StreamOps health',
            description:
                'Checks the health of the StreamOps service and its database dependency.',
        }),
        ApiOkResponse({
            description: 'Health status returned successfully.',
            schema: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['ok', 'degraded'],
                        example: 'ok',
                        description:
                            'Overall service status. `degraded` indicates that the database dependency is unavailable.',
                    },
                    service: {
                        type: 'string',
                        example: 'streamops',
                    },
                    dependencies: {
                        type: 'object',
                        properties: {
                            database: {
                                type: 'boolean',
                                example: true,
                                description:
                                    'Whether the database is reachable.',
                            },
                        },
                    },
                },
            },
        }),
    );
