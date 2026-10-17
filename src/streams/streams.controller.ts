import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateStreamDto } from './dto/create-stream.dto.js';
import { UpdateStreamDto } from './dto/update-stream.dto.js';
import { StreamResponseDto } from './dto/stream-response.dto.js';
import { StreamsService } from './streams.service.js';

@ApiTags('Streams')
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a stream',
    description: 'Creates a new stream record.',
  })
  @ApiCreatedResponse({
    description: 'Stream created successfully.',
    type: StreamResponseDto,
  })
  create(@Body() dto: CreateStreamDto) {
    return this.streamsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List streams',
    description: 'Returns all streams ordered by most recent start time.',
  })
  @ApiOkResponse({
    description: 'Streams returned successfully.',
    type: StreamResponseDto,
    isArray: true,
  })
  findAll() {
    return this.streamsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a stream',
    description: 'Returns a stream by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Stream UUID.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Stream returned successfully.',
    type: StreamResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Stream was not found.',
  })
  findOne(@Param('id') id: string) {
    return this.streamsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a stream',
    description: 'Updates the details of an existing stream.',
  })
  @ApiParam({
    name: 'id',
    description: 'Stream UUID.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Stream updated successfully.',
    type: StreamResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Stream was not found.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStreamDto,
  ) {
    return this.streamsService.update(id, dto);
  }

  @Post(':id/end')
  @ApiOperation({
    summary: 'End a stream',
    description:
      'Marks a stream as ended using the current server time.',
  })
  @ApiParam({
    name: 'id',
    description: 'Stream UUID.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Stream ended successfully.',
    type: StreamResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Stream was not found.',
  })
  end(@Param('id') id: string) {
    return this.streamsService.end(id);
  }
}