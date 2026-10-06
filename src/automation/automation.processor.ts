import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { WebhookExecutor } from './executors/webhook.executor.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { ConditionEvaluator } from './condition-evaluator.service.js';

@Injectable()
@Processor(QUEUE_NAMES.automation)
export class AutomationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookExecutor: WebhookExecutor,
    private readonly conditionEvaluator: ConditionEvaluator,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    console.log(
      `[AutomationProcessor] Processing job ${job.id}:`,
      job.name,
      job.data,
    );

    if (job.name !== 'automation.execute') {
      return;
    }

    const { eventId, ruleId } = job.data;

    const event = await this.prisma.streamEvent.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const rule = await this.prisma.automationRule.findUnique({
      where: {
        id: ruleId,
      },
    });

    if (!rule) {
      throw new Error(`Automation rule ${ruleId} not found`);
    }

    const matches = this.conditionEvaluator.matches(
      rule.conditions,
      event.payload as Record<string, unknown>,
    );

    if (!matches) {
      console.log(
        `[AutomationProcessor] Rule ${rule.id} conditions did not match event ${event.id}`,
      );

      return;
    }

    let execution =
      await this.prisma.automationExecution.findUnique({
        where: {
          ruleId_eventId: {
            ruleId: rule.id,
            eventId: event.id,
          },
        },
      });

    if (execution?.status === 'COMPLETED') {
      console.log(
        `[AutomationProcessor] Execution ${execution.id} already completed, skipping`,
      );

      return;
    }

    if (execution?.status === 'RUNNING') {
      console.log(
        `[AutomationProcessor] Execution ${execution.id} is already running, skipping`,
      );

      return;
    }

    if (!execution) {
      execution =
        await this.prisma.automationExecution.create({
          data: {
            ruleId: rule.id,
            eventId: event.id,
            status: 'RUNNING',
          },
        });
    } else {
      execution =
        await this.prisma.automationExecution.update({
          where: {
            id: execution.id,
          },
          data: {
            status: 'RUNNING',
            result: Prisma.JsonNull,
            completedAt: null,
          },
        });
    }

    try {
      const actions = Array.isArray(rule.actions)
        ? rule.actions
        : [];

      const results: Prisma.InputJsonValue[] = [];
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

      console.log(
        `[AutomationProcessor] Execution ${execution.id} completed`,
      );
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

      throw error;
    }
  }
}