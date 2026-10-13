import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
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
    if (dto.externalId) {
      const existing = await this.prisma.streamEvent.findUnique({
        where: {
          externalId: dto.externalId,
        },
      });

      if (existing) {
        return existing;
      }
    }

    try {
      const event = await this.prisma.streamEvent.create({
        data: {
          streamId: dto.streamId,
          externalId: dto.externalId,
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Event with this externalId already exists',
        );
      }

      throw error;
    }
  }
}