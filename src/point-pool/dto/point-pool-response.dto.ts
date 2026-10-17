
import { ApiProperty } from '@nestjs/swagger';

export class PointPoolEventResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Project SEKAI Challenge' })
  name!: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['DRAFT', 'ACTIVE', 'COMPLETED'] })
  status!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-10-17T02:00:00.000Z',
  })
  startedAt!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  endedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PointPoolEventListItemResponseDto extends PointPoolEventResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      redemptions: { type: 'integer', example: 12 },
    },
  })
  _count!: {
    redemptions: number;
  };
}

export class PointPoolRedemptionResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({ example: 'twitch-redemption-123' })
  twitchRedemptionId!: string;

  @ApiProperty({ example: '123456789' })
  userId!: string;

  @ApiProperty({ example: 'viewer123' })
  userLogin!: string;

  @ApiProperty({ example: 'Viewer123' })
  userDisplayName!: string;

  @ApiProperty({ example: 'reward-123' })
  rewardId!: string;

  @ApiProperty({ example: 'Cheer for the challenge' })
  rewardTitle!: string;

  @ApiProperty({ example: 500 })
  pointsCost!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  redeemedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  pointPoolEventId!: string;
}

export class PointPoolGoalResponseDto {
  @ApiProperty({ example: '770e8400-e29b-41d4-a716-446655440002' })
  id!: string;

  @ApiProperty({ example: 10000 })
  targetPoints!: number;

  @ApiProperty({ example: 'Reach 10,000 points' })
  description!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  pointPoolEventId!: string;
}

export class PointPoolSummaryResponseDto {
  @ApiProperty({ type: () => PointPoolEventResponseDto })
  event!: PointPoolEventResponseDto;

  @ApiProperty({ example: 7500 })
  totalPoints!: number;

  @ApiProperty({ example: 12 })
  redemptionCount!: number;
}

export class ActivePointPoolProgressResponseDto {
  @ApiProperty({
    type: () => PointPoolEventResponseDto,
    nullable: true,
    example: null,
  })
  pool!: PointPoolEventResponseDto | null;

  @ApiProperty({ example: 7500 })
  totalPoints!: number;

  @ApiProperty({ type: () => [PointPoolGoalResponseDto] })
  goals!: PointPoolGoalResponseDto[];
}
