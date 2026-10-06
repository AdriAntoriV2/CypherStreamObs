import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

const EXECUTION_LEASE_MS = 5 * 60 * 1_000;

@Injectable()
export class AutomationExecutionService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async find(
    ruleId: string,
    eventId: string,
  ) {
    return this.prisma.automationExecution.findUnique({
      where: {
        ruleId_eventId: {
          ruleId,
          eventId,
        },
      },
    });
  }

  isCompleted(
    execution: {
      status: string;
    } | null,
  ): boolean {
    return execution?.status === 'COMPLETED';
  }

  isRunning(
    execution: {
      status: string;
    } | null,
  ): boolean {
    return execution?.status === 'RUNNING';
  }

  isLeaseActive(
    execution: {
      status: string;
      updatedAt: Date;
    } | null,
  ): boolean {
    const age =
      Date.now() - (execution?.updatedAt.getTime() ?? 0);

    return age < EXECUTION_LEASE_MS;
  }

  async start(
    execution: {
      id: string;
    } | null,
    ruleId: string,
    eventId: string,
  ) {
    if (!execution) {
      return this.prisma.automationExecution.create({
        data: {
          ruleId,
          eventId,
          status: 'RUNNING',
        },
      });
    }

    return this.prisma.automationExecution.update({
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

  async complete(
    executionId: string,
    result: unknown,
  ) {
    return this.prisma.automationExecution.update({
      where: {
        id: executionId,
      },
      data: {
        status: 'COMPLETED',
        result: result as any,
        completedAt: new Date(),
      },
    });
  }

  async fail(
    executionId: string,
    error: unknown,
  ) {
    return this.prisma.automationExecution.update({
      where: {
        id: executionId,
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