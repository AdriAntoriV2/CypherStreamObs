import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateStreamDto } from './dto/create-stream.dto.js';
import { UpdateStreamDto } from './dto/update-stream.dto.js';

@Injectable()
export class StreamsService {
  [x: string]: any;
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStreamDto) {
    return this.prisma.stream.create({
      data: {
        title: dto.title,
        startedAt: dto.startedAt
          ? new Date(dto.startedAt)
          : new Date(),
      },
    });
  }

  async findAll() {
    return this.prisma.stream.findMany({
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundException(`Stream ${id} not found`);
    }

    return stream;
  }

  async update(id: string, dto: UpdateStreamDto) {
    await this.findOne(id);

    return this.prisma.stream.update({
      where: { id },
      data: {
        title: dto.title,
        startedAt: dto.startedAt
          ? new Date(dto.startedAt)
          : undefined,
        endedAt: dto.endedAt
          ? new Date(dto.endedAt)
          : undefined,
      },
    });
  }

  async end(id: string) {
    await this.findOne(id);

    return this.prisma.stream.update({
      where: { id },
      data: {
        endedAt: new Date(),
      },
    });
  }
}