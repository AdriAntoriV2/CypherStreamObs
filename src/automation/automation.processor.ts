import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { ConditionEvaluator } from './condition-evaluator.service.js';
import { ActionExecutor } from './action-executor.service.js';

const EXECUTION_LEASE_MS = 5 * 60 * 1_000;

@Injectable()
@Processor(QUEUE_NAMES.automation)
export class AutomationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionExecutor: ActionExecutor,
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
      const executionAge =
        Date.now() - execution.updatedAt.getTime();

      if (executionAge < EXECUTION_LEASE_MS) {
        console.log(
          `[AutomationProcessor] Execution ${execution.id} is still active, skipping`,
        );

        return;
      }

      console.log(
        `[AutomationProcessor] Execution ${execution.id} is stale, recovering`,
      );

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

      const results: unknown[] = [];

      for (let index = 0; index < actions.length; index++) {
        const action = actions[index];

        if (
          typeof action !== 'object' ||
          action === null ||
          Array.isArray(action)
        ) {
          throw new Error(
            `Automation action at index ${index} must be an object`,
          );
        }

        const actionType = action.type;

        if (typeof actionType !== 'string') {
          throw new Error(
            `Automation action at index ${index} requires a type`,
          );
        }

        let actionExecution =
          await this.prisma.automationActionExecution.findUnique({
            where: {
              executionId_actionIndex: {
                executionId: execution.id,
                actionIndex: index,
              },
            },
          });

        if (actionExecution?.status === 'COMPLETED') {
          console.log(
            `[AutomationProcessor] Action ${index} of execution ${execution.id} already completed, skipping`,
          );

          results.push(actionExecution.result);
          continue;
        }

        if (!actionExecution) {
          actionExecution =
            await this.prisma.automationActionExecution.create({
              data: {
                executionId: execution.id,
                actionIndex: index,
                actionType,
                status: 'RUNNING',
              },
            });
        } else {
          actionExecution =
            await this.prisma.automationActionExecution.update({
              where: {
                id: actionExecution.id,
              },
              data: {
                status: 'RUNNING',
                error: null,
                completedAt: null,
              },
            });
        }

        try {
          console.log(
            `[AutomationProcessor] Executing action ${index} (${actionType}) for execution ${execution.id}`,
          );
          const result =
            await this.actionExecutor.execute(
              action as Record<string, unknown>,
            );

          await this.prisma.automationActionExecution.update({
            where: {
              id: actionExecution.id,
            },
            data: {
              status: 'COMPLETED',
              result:
                result as Prisma.InputJsonValue,
              completedAt: new Date(),
            },
          });

          results.push(result);
        } catch (error) {
          await this.prisma.automationActionExecution.update({
            where: {
              id: actionExecution.id,
            },
            data: {
              status: 'FAILED',
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error',
              completedAt: new Date(),
            },
          });

          throw error;
        }
      }

      await this.prisma.automationExecution.update({
        where: {
          id: execution.id,
        },
        data: {
          status: 'COMPLETED',
          result: results as Prisma.InputJsonValue,
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