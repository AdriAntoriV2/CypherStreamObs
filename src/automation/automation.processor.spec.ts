import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationProcessor } from './automation.processor.js';

describe('AutomationProcessor', () => {
    let processor: AutomationProcessor;

    const prisma = {
        streamEvent: {
            findUnique: vi.fn(),
        },
        automationRule: {
            findUnique: vi.fn(),
        },
        automationExecution: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        automationActionExecution: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    };

    const actionExecutor = {
        execute: vi.fn(),
    };

    const conditionEvaluator = {
        matches: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        processor = new AutomationProcessor(
            prisma as any,
            actionExecutor as any,
            conditionEvaluator as any,
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

        actionExecutor.execute.mockResolvedValue({
            status: 200,
        });
    };

    it('should skip an already completed execution', async () => {
        setupMatchingRule();

        prisma.automationExecution.findUnique.mockResolvedValue({
            id: 'execution-1',
            status: 'COMPLETED',
            updatedAt: new Date(),
        });

        await processor.process(
            createJob({
                eventId: 'event-1',
                ruleId: 'rule-1',
            }),
        );

        expect(
            actionExecutor.execute,
        ).not.toHaveBeenCalled();

        expect(
            prisma.automationExecution.create,
        ).not.toHaveBeenCalled();
    });

    it('should skip a fresh running execution', async () => {
        setupMatchingRule();

        prisma.automationExecution.findUnique.mockResolvedValue({
            id: 'execution-1',
            status: 'RUNNING',
            updatedAt: new Date(),
        });

        await processor.process(
            createJob({
                eventId: 'event-1',
                ruleId: 'rule-1',
            }),
        );

        expect(
            actionExecutor.execute,
        ).not.toHaveBeenCalled();

        expect(
            prisma.automationExecution.update,
        ).not.toHaveBeenCalled();
    });

    it('should recover a stale running execution', async () => {
        setupMatchingRule();

        prisma.automationExecution.findUnique.mockResolvedValue({
            id: 'execution-1',
            status: 'RUNNING',
            updatedAt: new Date(
                Date.now() - 10 * 60 * 1_000,
            ),
        });

        prisma.automationExecution.update.mockResolvedValue({
            id: 'execution-1',
            status: 'RUNNING',
        });

        prisma.automationActionExecution.findUnique.mockResolvedValue(
            null,
        );

        prisma.automationActionExecution.create.mockResolvedValue({
            id: 'action-execution-1',
        });

        prisma.automationActionExecution.update.mockResolvedValue(
            {},
        );

        await processor.process(
            createJob({
                eventId: 'event-1',
                ruleId: 'rule-1',
            }),
        );

        expect(
            prisma.automationExecution.update,
        ).toHaveBeenCalled();

        expect(
            actionExecutor.execute,
        ).toHaveBeenCalledTimes(1);
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
            prisma.automationExecution.findUnique,
        ).not.toHaveBeenCalled();

        expect(
            actionExecutor.execute,
        ).not.toHaveBeenCalled();
    });

    it('should retry failed actions without repeating completed actions', async () => {
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

        prisma.automationExecution.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
                id: 'execution-1',
                status: 'RUNNING',
                updatedAt: new Date(
                    Date.now() - 10 * 60 * 1_000,
                ),
            });

        prisma.automationExecution.create.mockResolvedValue({
            id: 'execution-1',
            status: 'RUNNING',
        });

        prisma.automationActionExecution.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
                id: 'action-execution-0',
                status: 'COMPLETED',
                result: {
                    status: 200,
                },
            })
            .mockResolvedValueOnce(null);

        prisma.automationActionExecution.create.mockResolvedValue({
            id: 'action-execution-1',
        });

        prisma.automationActionExecution.update.mockResolvedValue(
            {},
        );

        actionExecutor.execute
            .mockResolvedValueOnce({
                status: 200,
            })
            .mockRejectedValueOnce(
                new Error('Webhook failed'),
            )
            .mockRejectedValueOnce(
                new Error('Webhook failed'),
            );

        // First attempt
        await expect(
            processor.process(
                createJob({
                    eventId: 'event-1',
                    ruleId: 'rule-1',
                }),
            ),
        ).rejects.toThrow('Webhook failed');

        expect(
            actionExecutor.execute,
        ).toHaveBeenCalledTimes(2);

        // Second attempt
        await expect(
            processor.process(
                createJob({
                    eventId: 'event-1',
                    ruleId: 'rule-1',
                }),
            ),
        ).rejects.toThrow('Webhook failed');

        // Action 0 was completed already, so only action 1
        // should execute on the retry.
        expect(
            actionExecutor.execute,
        ).toHaveBeenCalledTimes(3);

        expect(
            actionExecutor.execute,
        ).toHaveBeenLastCalledWith({
            type: 'webhook',
            url: 'https://example.com/second',
        });
    });
});