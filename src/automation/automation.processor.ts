import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { WebhookExecutor } from './executors/webhook.executor.js';

@Injectable()
export class AutomationProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookExecutor: WebhookExecutor,
  ) {}

  async processEvent(eventId: string) {
    const event = await this.prisma.streamEvent.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const rules = await this.prisma.automationRule.findMany({
      where: {
        eventType: event.type,
        enabled: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    for (const rule of rules) {
      const execution = await this.prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          eventId: event.id,
          status: 'RUNNING',
        },
      });

      try {
        const actions = Array.isArray(rule.actions)
          ? rule.actions
          : [];

        const results = [];

        for (const action of actions) {
          if (
            typeof action === 'object' &&
            action !== null &&
            'type' in action &&
            action.type === 'webhook'
          ) {
            const result =
              await this.webhookExecutor.execute(
                action as Record<string, unknown>,
              );

            results.push(result);
          }
        }

        await this.prisma.automationExecution.update({
          where: {
            id: execution.id,
          },
          data: {
            status: 'COMPLETED',
            result: results,
            completedAt: new Date(),
          },
        });
      } catch (error) {
        await this.prisma.automationExecution.update({
          where: {
            id: execution.id,
          },
          data: {
            status: 'FAILED',
            result: {
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error',
            },
            completedAt: new Date(),
          },
        });
      }
    }
  }
}