
import { applyDecorators } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiExtraModels,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
    ApiUnauthorizedResponse,
    getSchemaPath,
} from '@nestjs/swagger';

import {
    ActivePointPoolProgressResponseDto,
    PointPoolEventListItemResponseDto,
    PointPoolEventResponseDto,
    PointPoolGoalResponseDto,
    PointPoolRedemptionResponseDto,
    PointPoolSummaryResponseDto,
} from './dto/point-pool-response.dto.js';

const eventId = '550e8400-e29b-41d4-a716-446655440000';

const eventExample = {
    id: eventId,
    name: 'Project SEKAI Challenge',
    status: 'ACTIVE',
    startedAt: '2026-10-17T02:00:00.000Z',
    endedAt: null,
    createdAt: '2026-10-17T01:00:00.000Z',
    updatedAt: '2026-10-17T02:00:00.000Z',
};

const redemptionExample = {
    id: '660e8400-e29b-41d4-a716-446655440001',
    twitchRedemptionId: 'twitch-redemption-123',
    userId: '123456789',
    userLogin: 'viewer123',
    userDisplayName: 'Viewer123',
    rewardId: 'reward-123',
    rewardTitle: 'Cheer for the challenge',
    pointsCost: 500,
    redeemedAt: '2026-10-17T02:15:00.000Z',
    createdAt: '2026-10-17T02:15:01.000Z',
    pointPoolEventId: eventId,
};

const goalExample = {
    id: '770e8400-e29b-41d4-a716-446655440002',
    targetPoints: 10000,
    description: 'Reach 10,000 points',
    createdAt: '2026-10-17T02:10:00.000Z',
    pointPoolEventId: eventId,
};

const errorExample = (
    statusCode: number,
    message: string | string[],
    error: string,
) => ({
    statusCode,
    message,
    error,
});

const unauthorizedExample = {
    statusCode: 401,
    message: 'Unauthorized',
};

const forbiddenExample = errorExample(
    403,
    'Forbidden resource',
    'Forbidden',
);

const notFoundExample = errorExample(
    404,
    'Point pool event not found',
    'Not Found',
);

const conflictExamples = {
    completedEvent: {
        summary: 'Cannot restart a completed pool',
        value: errorExample(
            409,
            'A completed point pool cannot be restarted',
            'Conflict',
        ),
    },
    anotherActiveEvent: {
        summary: 'Another pool is already active',
        value: errorExample(
            409,
            'Another point pool is already active: Another Challenge',
            'Conflict',
        ),
    },
    inactiveEvent: {
        summary: 'Cannot finish an inactive pool',
        value: errorExample(
            409,
            'Only an active point pool can be finished',
            'Conflict',
        ),
    },
};

const eventParam = () =>
    ApiParam({
        name: 'id',
        description: 'Point pool event ID.',
        example: eventId,
    });

const adminErrors = () =>
    applyDecorators(
        ApiUnauthorizedResponse({
            description: 'Authentication is missing or invalid.',
            content: {
                'application/json': {
                    example: unauthorizedExample,
                },
            },
        }),
        ApiForbiddenResponse({
            description: 'The authenticated user does not have admin access.',
            content: {
                'application/json': {
                    example: forbiddenExample,
                },
            },
        }),
    );

const notFoundError = () =>
    ApiNotFoundResponse({
        description: 'The point pool event does not exist.',
        content: {
            'application/json': {
                example: notFoundExample,
            },
        },
    });

const pointPoolEventResponse = (example: object) => ({
    schema: {
        allOf: [{ $ref: getSchemaPath(PointPoolEventResponseDto) }],
    },
    example,
});

export const ApiPointPoolControllerDocs = () =>
    applyDecorators(
        ApiTags('Point Pool'),
        ApiExtraModels(
            PointPoolEventResponseDto,
            PointPoolEventListItemResponseDto,
            PointPoolRedemptionResponseDto,
            PointPoolGoalResponseDto,
            PointPoolSummaryResponseDto,
            ActivePointPoolProgressResponseDto,
        ),
    );

export const ApiCreatePointPoolEvent = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Create a point pool event',
            description:
                'Creates a new point pool event. Requires admin access.',
        }),
        ApiResponse({
            status: 201,
            description: 'Point pool event created.',
            content: {
                'application/json': {
                    schema: {
                        allOf: [
                            { $ref: getSchemaPath(PointPoolEventResponseDto) },
                        ],
                    },
                    example: {
                        ...eventExample,
                        status: 'DRAFT',
                        startedAt: null,
                    },
                },
            },
        }),
        ApiBadRequestResponse({
            description: 'The request body is invalid.',
            content: {
                'application/json': {
                    example: errorExample(
                        400,
                        [
                            'name should not be empty',
                            'name must be shorter than or equal to 100 characters',
                        ],
                        'Bad Request',
                    ),
                },
            },
        }),
        adminErrors(),
    );

export const ApiListPointPoolEvents = () =>
    applyDecorators(
        ApiOperation({
            summary: 'List point pool events',
            description:
                'Returns point pool events ordered by creation date, newest first.',
        }),
        ApiResponse({
            status: 200,
            description: 'Point pool events returned.',
            content: {
                'application/json': {
                    schema: {
                        type: 'array',
                        items: {
                            $ref: getSchemaPath(
                                PointPoolEventListItemResponseDto,
                            ),
                        },
                    },
                    example: [
                        {
                            ...eventExample,
                            _count: { redemptions: 12 },
                        },
                    ],
                },
            },
        }),
    );

export const ApiGetActivePointPoolProgress = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get active point pool progress',
            description:
                'Returns the active pool, accumulated points, and goals. If no pool is active, pool is null, totalPoints is 0, and goals is an empty array.',
        }),
        ApiResponse({
            status: 200,
            description:
                'Active pool progress, or an empty result when no pool is active.',
            content: {
                'application/json': {
                    schema: {
                        $ref: getSchemaPath(
                            ActivePointPoolProgressResponseDto,
                        ),
                    },
                    examples: {
                        activePool: {
                            summary: 'An active pool exists',
                            value: {
                                pool: eventExample,
                                totalPoints: 7500,
                                goals: [goalExample],
                            },
                        },
                        noActivePool: {
                            summary: 'No active pool',
                            value: {
                                pool: null,
                                totalPoints: 0,
                                goals: [],
                            },
                        },
                    },
                },
            },
        }),
    );

export const ApiGetPointPoolEvent = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get a point pool event',
            description: 'Returns one point pool event by ID.',
        }),
        eventParam(),
        ApiResponse({
            status: 200,
            description: 'Point pool event returned.',
            content: {
                'application/json': {
                    ...pointPoolEventResponse(eventExample),
                },
            },
        }),
        notFoundError(),
    );

export const ApiStartPointPoolEvent = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Start a point pool event',
            description:
                'Starts a draft event. An already active event is returned unchanged. Completed events cannot be restarted. Requires admin access.',
        }),
        eventParam(),
        ApiResponse({
            status: 201,
            description: 'The event is now active, or was already active.',
            content: {
                'application/json': {
                    ...pointPoolEventResponse(eventExample),
                },
            },
        }),
        notFoundError(),
        ApiResponse({
            status: 409,
            description:
                'The event is completed, or another pool is already active.',
            content: {
                'application/json': {
                    schema: { type: 'object' },
                    examples: conflictExamples,
                },
            },
        }),
        adminErrors(),
    );

export const ApiFinishPointPoolEvent = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Finish a point pool event',
            description:
                'Marks an active event as completed. Requires admin access.',
        }),
        eventParam(),
        ApiResponse({
            status: 201,
            description: 'The event was marked as completed.',
            content: {
                'application/json': {
                    ...pointPoolEventResponse({
                        ...eventExample,
                        status: 'COMPLETED',
                        endedAt: '2026-10-17T03:00:00.000Z',
                        updatedAt: '2026-10-17T03:00:00.000Z',
                    }),
                },
            },
        }),
        notFoundError(),
        ApiResponse({
            status: 409,
            description: 'Only active point pools can be finished.',
            content: {
                'application/json': {
                    schema: { type: 'object' },
                    examples: {
                        inactiveEvent: conflictExamples.inactiveEvent,
                    },
                },
            },
        }),
        adminErrors(),
    );

export const ApiGetPointPoolEventSummary = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get a point pool event summary',
            description:
                'Returns the event, total redeemed points, and redemption count.',
        }),
        eventParam(),
        ApiResponse({
            status: 200,
            description: 'Point pool event summary returned.',
            content: {
                'application/json': {
                    schema: {
                        $ref: getSchemaPath(PointPoolSummaryResponseDto),
                    },
                    example: {
                        event: eventExample,
                        totalPoints: 7500,
                        redemptionCount: 12,
                    },
                },
            },
        }),
        notFoundError(),
    );

export const ApiListPointPoolRedemptions = () =>
    applyDecorators(
        ApiOperation({
            summary: 'List point pool redemptions',
            description:
                'Returns up to 100 redemptions for an event, newest first.',
        }),
        eventParam(),
        ApiResponse({
            status: 200,
            description: 'Redemptions returned.',
            content: {
                'application/json': {
                    schema: {
                        type: 'array',
                        items: {
                            $ref: getSchemaPath(
                                PointPoolRedemptionResponseDto,
                            ),
                        },
                    },
                    example: [redemptionExample],
                },
            },
        }),
        notFoundError(),
    );
