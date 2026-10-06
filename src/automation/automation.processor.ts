import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { ConditionEvaluator } from './condition-evaluator.service.js';
import { ActionExecutor } from './action-executor.service.js';
import { AutomationConditions } from './types/condition.types.js';
import { ActionParser } from './action-parser.service.js';
import { AutomationExecutionService } from './automation-execution.service.js';

@Injectable()
@Processor(QUEUE_NAMES.automation)
export class AutomationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionExecutor: ActionExecutor,
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly actionParser: ActionParser,
    private readonly executionService: AutomationExecutionService,
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
      rule.conditions as AutomationConditions | null,
      event.payload as Record<string, unknown>,
    );

    if (!matches) {
      console.log(
        `[AutomationProcessor] Rule ${rule.id} conditions did not match event ${event.id}`,
      );

      return;
    }

    let execution =
      await this.executionService.find(
        rule.id,
        event.id,
      );

    if (this.executionService.isCompleted(execution)) {
      console.log(
        `[AutomationProcessor] Execution ${execution!.id} already completed, skipping`,
      );
      return;
    }

    if (this.executionService.isRunning(execution)) {
      if (
        this.executionService.isLeaseActive(
          execution,
        )
      ) {
        console.log(
          `[AutomationProcessor] Execution ${execution!.id} is still active, skipping`,
        );
        return;
      }

      console.log(
        `[AutomationProcessor] Execution ${execution!.id} is stale, recovering`,
      );
    }

    execution =
      await this.executionService.start(
        execution,
        rule.id,
        event.id,
      );

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
          const parsedAction =
            this.actionParser.parse(action);

          const result =
            await this.actionExecutor.execute(
              parsedAction,
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

      await this.executionService.complete(
        execution.id,
        results,
      );

      console.log(
        `[AutomationProcessor] Execution ${execution.id} completed`,
      );
    } catch (error) {
      await this.executionService.fail(
        execution.id,
        error,
      );

      throw error;
    }
  }
}