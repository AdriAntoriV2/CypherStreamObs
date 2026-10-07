import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';
import { ConditionEvaluator } from './condition-evaluator.service.js';
import { AutomationConditions } from './types/condition.types.js';
import { AutomationExecutionService } from './automation-execution.service.js';
import { AutomationActionExecutionService } from './automation-action-execution.service.js';

@Injectable()
@Processor(QUEUE_NAMES.automation)
export class AutomationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly executionService: AutomationExecutionService,
    private readonly actionExecutionService: AutomationActionExecutionService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    console.log(
      `[AutomationProcessor] Processing job ${job.id}:`,
      job.name,
      `attempt ${job.attemptsMade + 1}/${job.opts?.attempts ?? 1}`,
      job.data,
    );

    if (job.name !== 'automation.execute') {
      return;
    }

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
    const attempt =
      (job.attemptsMade ?? 0) + 1;
    execution =
      await this.executionService.start(
        execution,
        rule.id,
        event.id,
        attempt,
      );

    try {
      const actions = Array.isArray(rule.actions)
        ? rule.actions
        : [];

      const results: unknown[] = [];

      for (let index = 0; index < actions.length; index++) {
        const result =
          await this.actionExecutionService.execute(
            execution.id,
            index,
            actions[index],
          );

        results.push(result);
      }

      await this.executionService.complete(
        execution.id,
        results,
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