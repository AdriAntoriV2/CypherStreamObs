import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

const EXECUTION_LEASE_MS = 5 * 60 * 1_000;

@Injectable()
export class AutomationExecutionService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

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
    attempt: number,
  ) {
    if (!execution) {
      return this.prisma.automationExecution.create({
        data: {
          ruleId,
          eventId,
          status: 'RUNNING',
          attempts: attempt,
          lastError: null,
        },
      });
    }

    return this.prisma.automationExecution.update({
      where: {
        id: execution.id,
      },
      data: {
        status: 'RUNNING',
        attempts: attempt,
        result: Prisma.JsonNull,
        lastError: null,
        completedAt: null,
      },
    });
  }

  async complete(
    executionId: string,
    result: unknown,
  ) {
    return this.prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        result: result as any,
        lastError: null,
        completedAt: new Date(),
      },
    });
  }

  async fail(
    executionId: string,
    error: unknown,
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error';

    return this.prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        lastError: message,
        result: {
          error: message,
        },
        completedAt: new Date(),
      },
    });
  }

  async findById(id: string) {
    const execution =
      await this.prisma.automationExecution.findUnique({
        where: { id },
        include: {
          actions: {
            orderBy: {
              actionIndex: 'asc',
            },
          },
          rule: true,
          event: true,
        },
      });

    if (!execution) {
      throw new NotFoundException(
        `Automation execution ${id} not found`,
      );
    }

    return execution;
  }

  async findAll(
    page = 1,
    limit = 20,
    status?: string,
    ruleId?: string,
    eventId?: string,
    from?: string,
    to?: string,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(ruleId ? { ruleId } : {}),
      ...(eventId ? { eventId } : {}),
      ...((from || to)
        ? {
          createdAt: {
            ...(from
              ? { gte: new Date(from) }
              : {}),
            ...(to
              ? { lte: new Date(to) }
              : {}),
          },
        }
        : {}),
    };

    const [executions, total] =
      await this.prisma.$transaction([
        this.prisma.automationExecution.findMany({
          skip,
          take: limit,
          where,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            rule: true,
            actions: {
              orderBy: {
                actionIndex: 'asc',
              },
            },
          },
        }),

        this.prisma.automationExecution.count({
          where,
        }),
      ]);

    return {
      data: executions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}