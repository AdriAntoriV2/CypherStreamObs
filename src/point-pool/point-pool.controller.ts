
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PointPoolService } from './point-pool.service.js';
import { CreatePointPoolEventDto } from './dto/create-point-pool-event.dto.js';
import { ChatCommandAdminGuard } from '../chat-commands/chat-command-admin.guard.js';

const eventExample = {
  id: '550e8400-e29b-41d4-a716-446655440000',
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
  pointPoolEventId: '550e8400-e29b-41d4-a716-446655440000',
};

const goalExample = {
  id: '770e8400-e29b-41d4-a716-446655440002',
  targetPoints: 10000,
  description: 'Reach 10,000 points',
  createdAt: '2026-10-17T02:10:00.000Z',
  pointPoolEventId: '550e8400-e29b-41d4-a716-446655440000',
};

const notFoundExample = {
  statusCode: 404,
  message: 'Point pool event not found',
  error: 'Not Found',
};

const conflictExample = {
  statusCode: 409,
  message: 'Only an active point pool can be finished',
  error: 'Conflict',
};

const unauthorizedExample = {
  statusCode: 401,
  message: 'Unauthorized',
};

const forbiddenExample = {
  statusCode: 403,
  message: 'Forbidden resource',
  error: 'Forbidden',
};

@ApiTags('Point Pool')
@Controller('point-pool')
export class PointPoolController {
  constructor(private readonly pointPoolService: PointPoolService) {}

  @Post('events')
  @UseGuards(ChatCommandAdminGuard)
  @ApiOperation({
    summary: 'Create a point pool event',
    description: 'Creates a new point pool event. Requires admin access.',
  })
  @ApiResponse({
    status: 201,
    description: 'Point pool event created.',
    schema: { example: { ...eventExample, status: 'DRAFT', startedAt: null } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body.',
    schema: {
      example: {
        statusCode: 400,
        message: ['name should not be empty', 'name must be shorter than or equal to 100 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is missing or invalid.',
    schema: { example: unauthorizedExample },
  })
  @ApiForbiddenResponse({
    description: 'The user does not have admin access.',
    schema: { example: forbiddenExample },
  })
  create(@Body() dto: CreatePointPoolEventDto) {
    return this.pointPoolService.create(dto.name);
  }

  @Get('events')
  @ApiOperation({
    summary: 'List point pool events',
    description: 'Returns point pool events ordered by creation date, newest first.',
  })
  @ApiResponse({
    status: 200,
    description: 'Point pool events returned.',
    schema: {
      example: [
        {
          ...eventExample,
          _count: { redemptions: 12 },
        },
      ],
    },
  })
  findAll() {
    return this.pointPoolService.findAll();
  }

  @Get('active/progress')
  @ApiOperation({
    summary: 'Get active point pool progress',
    description:
      'Returns the active pool, accumulated points, and goals. If no pool is active, pool is null, totalPoints is 0, and goals is an empty array.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active pool progress, or an empty result when no pool is active.',
    schema: {
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
  })
  getActiveProgress() {
    return this.pointPoolService.getActiveProgress();
  }

  @Get('events/:id')
  @ApiOperation({
    summary: 'Get a point pool event',
    description: 'Returns one point pool event by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Point pool event ID.',
    example: eventExample.id,
  })
  @ApiResponse({
    status: 200,
    description: 'Point pool event returned.',
    schema: { example: eventExample },
  })
  @ApiNotFoundResponse({
    description: 'The point pool event does not exist.',
    schema: { example: notFoundExample },
  })
  findOne(@Param('id') id: string) {
    return this.pointPoolService.findOne(id);
  }

  @Post('events/:id/start')
  @UseGuards(ChatCommandAdminGuard)
  @ApiOperation({
    summary: 'Start a point pool event',
    description:
      'Starts a draft or otherwise restartable event. An already active event is returned unchanged. Requires admin access.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the point pool event to start.',
    example: eventExample.id,
  })
  @ApiResponse({
    status: 201,
    description: 'The event is now active, or was already active.',
    schema: { example: eventExample },
  })
  @ApiNotFoundResponse({
    description: 'The point pool event does not exist.',
    schema: { example: notFoundExample },
  })
  @ApiResponse({
    status: 409,
    description: 'The event is completed, or another pool is already active.',
    schema: {
      examples: {
        completedEvent: {
          summary: 'Cannot restart a completed pool',
          value: {
            statusCode: 409,
            message: 'A completed point pool cannot be restarted',
            error: 'Conflict',
          },
        },
        anotherActiveEvent: {
          summary: 'Another pool is already active',
          value: {
            statusCode: 409,
            message: 'Another point pool is already active: Another Challenge',
            error: 'Conflict',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is missing or invalid.',
    schema: { example: unauthorizedExample },
  })
  @ApiForbiddenResponse({
    description: 'The user does not have admin access.',
    schema: { example: forbiddenExample },
  })
  start(@Param('id') id: string) {
    return this.pointPoolService.start(id);
  }

  @Post('events/:id/finish')
  @UseGuards(ChatCommandAdminGuard)
  @ApiOperation({
    summary: 'Finish a point pool event',
    description: 'Marks an active event as completed. Requires admin access.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the point pool event to finish.',
    example: eventExample.id,
  })
  @ApiResponse({
    status: 201,
    description: 'The event was marked as completed.',
    schema: {
      example: {
        ...eventExample,
        status: 'COMPLETED',
        endedAt: '2026-10-17T03:00:00.000Z',
        updatedAt: '2026-10-17T03:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'The point pool event does not exist.',
    schema: { example: notFoundExample },
  })
  @ApiResponse({
    status: 409,
    description: 'Only active point pools can be finished.',
    schema: { example: conflictExample },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is missing or invalid.',
    schema: { example: unauthorizedExample },
  })
  @ApiForbiddenResponse({
    description: 'The user does not have admin access.',
    schema: { example: forbiddenExample },
  })
  finish(@Param('id') id: string) {
    return this.pointPoolService.finish(id);
  }

  @Get('events/:id/summary')
  @ApiOperation({
    summary: 'Get a point pool event summary',
    description: 'Returns the event, total redeemed points, and redemption count.',
  })
  @ApiParam({
    name: 'id',
    description: 'Point pool event ID.',
    example: eventExample.id,
  })
  @ApiResponse({
    status: 200,
    description: 'Point pool event summary returned.',
    schema: {
      example: {
        event: eventExample,
        totalPoints: 7500,
        redemptionCount: 12,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'The point pool event does not exist.',
    schema: { example: notFoundExample },
  })
  getSummary(@Param('id') id: string) {
    return this.pointPoolService.getSummary(id);
  }

  @Get('events/:id/redemptions')
  @ApiOperation({
    summary: 'List point pool redemptions',
    description:
      'Returns up to 100 redemptions for an event, newest first.',
  })
  @ApiParam({
    name: 'id',
    description: 'Point pool event ID.',
    example: eventExample.id,
  })
  @ApiResponse({
    status: 200,
    description: 'Redemptions returned.',
    schema: { example: [redemptionExample] },
  })
  @ApiNotFoundResponse({
    description: 'The point pool event does not exist.',
    schema: { example: notFoundExample },
  })
  getRedemptions(@Param('id') id: string) {
    return this.pointPoolService.getRedemptions(id);
  }
}
