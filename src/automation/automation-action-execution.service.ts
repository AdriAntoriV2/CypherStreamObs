import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { ActionExecutor } from './action-executor.service.js';
import { ActionParser } from './action-parser.service.js';

@Injectable()
export class AutomationActionExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionParser: ActionParser,
    private readonly actionExecutor: ActionExecutor,
  ) {}

  async execute(
    executionId: string,
    actionIndex: number,
    rawAction: unknown,
  ): Promise<unknown> {
    const action =
      this.actionParser.parse(rawAction);

    let actionExecution =
      await this.prisma.automationActionExecution.findUnique({
        where: {
          executionId_actionIndex: {
            executionId,
            actionIndex,
          },
        },
      });

    if (actionExecution?.status === 'COMPLETED') {
      return actionExecution.result;
    }

    if (!actionExecution) {
      actionExecution =
        await this.prisma.automationActionExecution.create({
          data: {
            executionId,
            actionIndex,
            actionType: action.type,
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
      const result =
        await this.actionExecutor.execute(action);

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

      return result;
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
}