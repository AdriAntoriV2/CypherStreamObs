import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { ActionExecutor } from './action-executor.service.js';
import { ActionParser } from './action-parser.service.js';
import { AutomationActionExecutionService } from './automation-action-execution.service.js';

describe('AutomationActionExecutionService', () => {
  let service: AutomationActionExecutionService;

  const prisma = {
    automationActionExecution: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const actionParser = {
    parse: vi.fn(),
  };

  const actionExecutor = {
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service =
      new AutomationActionExecutionService(
        prisma as unknown as PrismaService,
        actionParser as unknown as ActionParser,
        actionExecutor as unknown as ActionExecutor,
      );
  });

  const action = {
    type: 'webhook',
    url: 'https://example.com/webhook',
  };

  const parsedAction = {
    type: 'webhook' as const,
    url: 'https://example.com/webhook',
  };

  it('should create an action execution and complete it', async () => {
    actionParser.parse.mockReturnValue(
      parsedAction,
    );

    prisma.automationActionExecution.findUnique.mockResolvedValue(
      null,
    );

    prisma.automationActionExecution.create.mockResolvedValue(
      {
        id: 'action-execution-1',
        executionId: 'execution-1',
        actionIndex: 0,
        actionType: 'webhook',
        status: 'RUNNING',
      },
    );

    actionExecutor.execute.mockResolvedValue({
      status: 200,
    });

    prisma.automationActionExecution.update.mockResolvedValue(
      {},
    );

    const result = await service.execute(
      'execution-1',
      0,
      action,
    );

    expect(
      actionParser.parse,
    ).toHaveBeenCalledWith(action);

    expect(
      prisma.automationActionExecution.create,
    ).toHaveBeenCalledWith({
      data: {
        executionId: 'execution-1',
        actionIndex: 0,
        actionType: 'webhook',
        status: 'RUNNING',
      },
    });

    expect(
      actionExecutor.execute,
    ).toHaveBeenCalledWith(parsedAction);

    expect(
      prisma.automationActionExecution.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'action-execution-1',
      },
      data: {
        status: 'COMPLETED',
        result: {
          status: 200,
        },
        completedAt: expect.any(Date),
      },
    });

    expect(result).toEqual({
      status: 200,
    });
  });

  it('should skip an already completed action execution', async () => {
    actionParser.parse.mockReturnValue(
      parsedAction,
    );

    prisma.automationActionExecution.findUnique.mockResolvedValue(
      {
        id: 'action-execution-1',
        status: 'COMPLETED',
        result: {
          status: 200,
        },
      },
    );

    const result = await service.execute(
      'execution-1',
      0,
      action,
    );

    expect(result).toEqual({
      status: 200,
    });

    expect(
      actionExecutor.execute,
    ).not.toHaveBeenCalled();

    expect(
      prisma.automationActionExecution.create,
    ).not.toHaveBeenCalled();

    expect(
      prisma.automationActionExecution.update,
    ).not.toHaveBeenCalled();
  });

  it('should retry a previously failed action execution', async () => {
    actionParser.parse.mockReturnValue(
      parsedAction,
    );

    prisma.automationActionExecution.findUnique.mockResolvedValue(
      {
        id: 'action-execution-1',
        status: 'FAILED',
        error: 'Previous failure',
      },
    );

    prisma.automationActionExecution.update
      .mockResolvedValueOnce({
        id: 'action-execution-1',
        status: 'RUNNING',
      })
      .mockResolvedValueOnce({});

    actionExecutor.execute.mockResolvedValue({
      status: 200,
    });

    const result = await service.execute(
      'execution-1',
      0,
      action,
    );

    expect(
      prisma.automationActionExecution.update,
    ).toHaveBeenNthCalledWith(
      1,
      {
        where: {
          id: 'action-execution-1',
        },
        data: {
          status: 'RUNNING',
          error: null,
          completedAt: null,
        },
      },
    );

    expect(
      actionExecutor.execute,
    ).toHaveBeenCalledWith(parsedAction);

    expect(
      prisma.automationActionExecution.update,
    ).toHaveBeenNthCalledWith(
      2,
      {
        where: {
          id: 'action-execution-1',
        },
        data: {
          status: 'COMPLETED',
          result: {
            status: 200,
          },
          completedAt: expect.any(Date),
        },
      },
    );

    expect(result).toEqual({
      status: 200,
    });
  });

  it('should mark the action as failed when execution throws', async () => {
    actionParser.parse.mockReturnValue(
      parsedAction,
    );

    prisma.automationActionExecution.findUnique.mockResolvedValue(
      null,
    );

    prisma.automationActionExecution.create.mockResolvedValue(
      {
        id: 'action-execution-1',
        executionId: 'execution-1',
        actionIndex: 0,
        actionType: 'webhook',
        status: 'RUNNING',
      },
    );

    const error = new Error(
      'Webhook request failed',
    );

    actionExecutor.execute.mockRejectedValue(
      error,
    );

    prisma.automationActionExecution.update.mockResolvedValue(
      {},
    );

    await expect(
      service.execute(
        'execution-1',
        0,
        action,
      ),
    ).rejects.toThrow(
      'Webhook request failed',
    );

    expect(
      prisma.automationActionExecution.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'action-execution-1',
      },
      data: {
        status: 'FAILED',
        error: 'Webhook request failed',
        completedAt: expect.any(Date),
      },
    });
  });

  it('should parse the action before creating an execution record', async () => {
    const error = new Error(
      'Invalid automation action',
    );

    actionParser.parse.mockImplementation(() => {
      throw error;
    });

    await expect(
      service.execute(
        'execution-1',
        0,
        {
          invalid: true,
        },
      ),
    ).rejects.toThrow(
      'Invalid automation action',
    );

    expect(
      prisma.automationActionExecution.findUnique,
    ).not.toHaveBeenCalled();

    expect(
      prisma.automationActionExecution.create,
    ).not.toHaveBeenCalled();

    expect(
      actionExecutor.execute,
    ).not.toHaveBeenCalled();
  });
});