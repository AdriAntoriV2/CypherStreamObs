
import { Body, Controller, Post } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventsService } from './events.service.js';
import {
    ApiCreateEvent,
    ApiEventsControllerDocs,
} from './events.swagger.js';

@ApiEventsControllerDocs()
@Controller('events')
export class EventsController {
    constructor(
        private readonly eventsService: EventsService,
    ) {}

    @Post()
    @ApiCreateEvent()
    create(@Body() dto: CreateEventDto) {
        return this.eventsService.create(dto);
    }
}
