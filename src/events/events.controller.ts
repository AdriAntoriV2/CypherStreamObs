
import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventsService } from './events.service.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a stream event',
    description:
      'Persists a stream event and queues it for downstream processing. ' +
      'If an event with the same externalId already exists, returns that event.',
  })
  @ApiCreatedResponse({
    description: 'Event created or an existing event returned.',
  })
  @ApiBadRequestResponse({
    description: 'The request body failed validation.',
  })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }
}
