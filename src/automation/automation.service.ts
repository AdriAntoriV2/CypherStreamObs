import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateRuleDto } from './dto/create-rule.dto.js';

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async createRule(dto: CreateRuleDto) {
    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        enabled: dto.enabled ?? true,
        eventType: dto.eventType,
        conditions:
          dto.conditions as Prisma.InputJsonValue,
        actions:
          dto.actions as unknown as Prisma.InputJsonValue,
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

  async findRule(id: string) {
    const rule =
      await this.prisma.automationRule.findUnique({
        where: { id },
      });

    if (!rule) {
      throw new NotFoundException(
        `Automation rule ${id} not found`,
      );
    }

    return rule;
  }

  async updateRule(
    id: string,
    dto: CreateRuleDto,
  ) {
    await this.findRule(id);

    return this.prisma.automationRule.update({
      where: { id },
      data: {
        name: dto.name,
        enabled: dto.enabled ?? true,
        eventType: dto.eventType,
        conditions:
          dto.conditions as Prisma.InputJsonValue,
        actions:
          dto.actions as unknown as Prisma.InputJsonValue,
        priority: dto.priority ?? 0,
      },
    });
  }

  async deleteRule(id: string) {
    await this.findRule(id);

    await this.prisma.automationRule.delete({
      where: { id },
    });
  }

  async setRuleEnabled(
    id: string,
    enabled: boolean,
  ) {
    await this.findRule(id);

    return this.prisma.automationRule.update({
      where: { id },
      data: { enabled },
    });
  }
}