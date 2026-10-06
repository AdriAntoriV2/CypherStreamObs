import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateRuleDto } from './dto/create-rule.dto.js';

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(dto: CreateRuleDto) {
    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        enabled: dto.enabled ?? true,
        eventType: dto.eventType,
        conditions: dto.conditions as Prisma.InputJsonValue,
        actions: dto.actions as Prisma.InputJsonValue,
        priority: dto.priority ?? 0,
      },
    });
  }

  async findMatchingRules(eventType: string) {
    return this.prisma.automationRule.findMany({
      where: {
        eventType,
        enabled: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });
  }

  async findAllRules() {
    return this.prisma.automationRule.findMany({
      orderBy: [
        {
          priority: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }
}