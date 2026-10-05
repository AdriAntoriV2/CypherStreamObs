import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async create(dto: CreateEventDto) {
    const event = await this.prisma.streamEvent.create({
      data: {
        streamId: dto.streamId,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });

    await this.queueService.addEvent({
      eventId: event.id,
      streamId: event.streamId,
      type: event.type,
      payload: event.payload,
    });

    return event;
  }
}