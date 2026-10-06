import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationProcessor } from './automation.processor.js';
import { PrismaService } from '../database/prisma.service.js';
import { ConditionEvaluator } from './condition-evaluator.service.js';
import { AutomationExecutionService } from './automation-execution.service.js';
import { AutomationActionExecutionService } from './automation-action-execution.service.js';

describe('AutomationProcessor', () => {
  let processor: AutomationProcessor;

  const prisma = {
    streamEvent: {
      findUnique: vi.fn(),
    },
    automationRule: {
      findUnique: vi.fn(),
    },
  };

  const conditionEvaluator = {
    matches: vi.fn(),
  };

  const executionService = {
    find: vi.fn(),
    isCompleted: vi.fn(),
    isRunning: vi.fn(),
    isLeaseActive: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
  };

  const actionExecutionService = {
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    processor = new AutomationProcessor(
      prisma as unknown as PrismaService,
      conditionEvaluator as unknown as ConditionEvaluator,
      executionService as unknown as AutomationExecutionService,
      actionExecutionService as unknown as AutomationActionExecutionService,
    );
  });

  const createJob = (
    data: Record<string, unknown>,
  ) =>
    ({
      id: 'job-1',
      name: 'automation.execute',
      data,
    }) as any;

  const setupMatchingRule = () => {
    prisma.streamEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      type: 'channel.follow',
      payload: {
        username: 'cypherusuh',
      },
    });

    prisma.automationRule.findUnique.mockResolvedValue({
      id: 'rule-1',
      conditions: null,
      actions: [
        {
          type: 'webhook',
          url: 'https://example.com/webhook',
        },
      ],
    });

    conditionEvaluator.matches.mockReturnValue(true);

    actionExecutionService.execute.mockResolvedValue({
      status: 200,
    });
  };

  it('should skip an already completed execution', async () => {
    setupMatchingRule();

    const execution = {
      id: 'execution-1',
      status: 'COMPLETED',
      updatedAt: new Date(),
    };

    executionService.find.mockResolvedValue(execution);
    executionService.isCompleted.mockReturnValue(true);

    await processor.process(
      createJob({
        eventId: 'event-1',
        ruleId: 'rule-1',
      }),
    );

    expect(
      actionExecutionService.execute,
    ).not.toHaveBeenCalled();

    expect(
      executionService.start,
    ).not.toHaveBeenCalled();
  });

  it('should skip a fresh running execution', async () => {
    setupMatchingRule();

    const execution = {
      id: 'execution-1',
      status: 'RUNNING',
      updatedAt: new Date(),
    };

    executionService.find.mockResolvedValue(execution);
    executionService.isCompleted.mockReturnValue(false);
    executionService.isRunning.mockReturnValue(true);
    executionService.isLeaseActive.mockReturnValue(true);

    await processor.process(
      createJob({
        eventId: 'event-1',
        ruleId: 'rule-1',
      }),
    );

    expect(
      actionExecutionService.execute,
    ).not.toHaveBeenCalled();

    expect(
      executionService.start,
    ).not.toHaveBeenCalled();
  });

  it('should recover a stale running execution', async () => {
    setupMatchingRule();

    const execution = {
      id: 'execution-1',
      status: 'RUNNING',
      updatedAt: new Date(
        Date.now() - 10 * 60 * 1_000,
      ),
    };

    const startedExecution = {
      id: 'execution-1',
      status: 'RUNNING',
    };

    executionService.find.mockResolvedValue(execution);
    executionService.isCompleted.mockReturnValue(false);
    executionService.isRunning.mockReturnValue(true);
    executionService.isLeaseActive.mockReturnValue(false);

    executionService.start.mockResolvedValue(
      startedExecution,
    );

    actionExecutionService.execute.mockResolvedValue({
      status: 200,
    });

    executionService.complete.mockResolvedValue({});

    await processor.process(
      createJob({
        eventId: 'event-1',
        ruleId: 'rule-1',
      }),
    );

    expect(
      executionService.start,
    ).toHaveBeenCalledWith(
      execution,
      'rule-1',
      'event-1',
    );

    expect(
      actionExecutionService.execute,
    ).toHaveBeenCalledTimes(1);

    expect(
      actionExecutionService.execute,
    ).toHaveBeenCalledWith(
      'execution-1',
      0,
      {
        type: 'webhook',
        url: 'https://example.com/webhook',
      },
    );

    expect(
      executionService.complete,
    ).toHaveBeenCalledWith(
      'execution-1',
      [
        {
          status: 200,
        },
      ],
    );
  });

  it('should skip execution when conditions do not match', async () => {
    setupMatchingRule();

    conditionEvaluator.matches.mockReturnValue(false);

    await processor.process(
      createJob({
        eventId: 'event-1',
        ruleId: 'rule-1',
      }),
    );

    expect(
      executionService.find,
    ).not.toHaveBeenCalled();

    expect(
      actionExecutionService.execute,
    ).not.toHaveBeenCalled();
  });

  it('should execute all actions through the action execution service', async () => {
    setupMatchingRule();

    prisma.automationRule.findUnique.mockResolvedValue({
      id: 'rule-1',
      conditions: null,
      actions: [
        {
          type: 'webhook',
          url: 'https://example.com/first',
        },
        {
          type: 'webhook',
          url: 'https://example.com/second',
        },
      ],
    });

    executionService.find.mockResolvedValue(null);

    executionService.isCompleted.mockReturnValue(false);
    executionService.isRunning.mockReturnValue(false);

    executionService.start.mockResolvedValue({
      id: 'execution-1',
      status: 'RUNNING',
    });

    actionExecutionService.execute
      .mockResolvedValueOnce({
        status: 200,
      })
      .mockResolvedValueOnce({
        status: 201,
      });

    executionService.complete.mockResolvedValue({});

    await processor.process(
      createJob({
        eventId: 'event-1',
        ruleId: 'rule-1',
      }),
    );

    expect(
      actionExecutionService.execute,
    ).toHaveBeenCalledTimes(2);

    expect(
      actionExecutionService.execute,
    ).toHaveBeenNthCalledWith(
      1,
      'execution-1',
      0,
      {
        type: 'webhook',
        url: 'https://example.com/first',
      },
    );

    expect(
      actionExecutionService.execute,
    ).toHaveBeenNthCalledWith(
      2,
      'execution-1',
      1,
      {
        type: 'webhook',
        url: 'https://example.com/second',
      },
    );

    expect(
      executionService.complete,
    ).toHaveBeenCalledWith(
      'execution-1',
      [
        {
          status: 200,
        },
        {
          status: 201,
        },
      ],
    );
  });
});