import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
/*
import { QueueModule } from '../queue/queue.module.js';
*/

@Module({
  controllers: [EventsController],
  providers: [EventsService],
  exports: [
    EventsService,
  ],
})
export class EventsModule { }