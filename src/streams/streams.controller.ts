import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateStreamDto } from './dto/create-stream.dto.js';
import { UpdateStreamDto } from './dto/update-stream.dto.js';
import { StreamsService } from './streams.service.js';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  create(@Body() dto: CreateStreamDto) {
    return this.streamsService.create(dto);
  }

  @Get()
  findAll() {
    return this.streamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.streamsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStreamDto,
  ) {
    return this.streamsService.update(id, dto);
  }

  @Post(':id/end')
  end(@Param('id') id: string) {
    return this.streamsService.end(id);
  }
}