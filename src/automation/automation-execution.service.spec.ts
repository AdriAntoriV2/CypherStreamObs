import { describe, expect, it, vi } from 'vitest';
import { AutomationExecutionService } from './automation-execution.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('AutomationExecutionService', () => {
    const prisma = {
        automationExecution: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
        },
        $transaction: vi.fn(),
    };

    let service: AutomationExecutionService;

    beforeEach(() => {
        vi.clearAllMocks();

        service = new AutomationExecutionService(
            prisma as unknown as PrismaService,
        );
    });

    describe('find', () => {
        it('finds an execution by rule and event', async () => {
            const execution = {
                id: 'execution-1',
                ruleId: 'rule-1',
                eventId: 'event-1',
                status: 'COMPLETED',
            };

            prisma.automationExecution.findUnique.mockResolvedValue(
                execution,
            );

            const result = await service.find(
                'rule-1',
                'event-1',
            );

            expect(
                prisma.automationExecution.findUnique,
            ).toHaveBeenCalledWith({
                where: {
                    ruleId_eventId: {
                        ruleId: 'rule-1',
                        eventId: 'event-1',
                    },
                },
            });

            expect(result).toBe(execution);
        });
    });

    describe('isCompleted', () => {
        it('returns true for completed executions', () => {
            expect(
                service.isCompleted({
                    status: 'COMPLETED',
                }),
            ).toBe(true);
        });

        it('returns false for non-completed executions', () => {
            expect(
                service.isCompleted({
                    status: 'RUNNING',
                }),
            ).toBe(false);
        });

        it('returns false for null', () => {
            expect(service.isCompleted(null)).toBe(false);
        });
    });

    describe('isRunning', () => {
        it('returns true for running executions', () => {
            expect(
                service.isRunning({
                    status: 'RUNNING',
                }),
            ).toBe(true);
        });

        it('returns false for non-running executions', () => {
            expect(
                service.isRunning({
                    status: 'COMPLETED',
                }),
            ).toBe(false);
        });

        it('returns false for null', () => {
            expect(service.isRunning(null)).toBe(false);
        });
    });

    describe('isLeaseActive', () => {
        it('returns false when execution does not exist', () => {
            expect(service.isLeaseActive(null)).toBe(false);
        });

        it('returns true when execution was updated recently', () => {
            expect(
                service.isLeaseActive({
                    status: 'RUNNING',
                    updatedAt: new Date(),
                }),
            ).toBe(true);
        });
    });

    describe('start', () => {
        it('creates a new execution', async () => {
            const execution = {
                id: 'execution-1',
                ruleId: 'rule-1',
                eventId: 'event-1',
                status: 'RUNNING',
            };

            prisma.automationExecution.create.mockResolvedValue(
                execution,
            );

            const result = await service.start(
                null,
                'rule-1',
                'event-1',
                2,
            );

            expect(
                prisma.automationExecution.create,
            ).toHaveBeenCalledWith({
                data: {
                    ruleId: 'rule-1',
                    eventId: 'event-1',
                    status: 'RUNNING',
                    attempts: 2,
                    lastError: null,
                },
            });

            expect(result).toBe(execution);
        });

        it('restarts an existing execution', async () => {
            const existing = {
                id: 'execution-1',
            };

            const execution = {
                id: 'execution-1',
                status: 'RUNNING',
            };

            prisma.automationExecution.update.mockResolvedValue(
                execution,
            );

            const result = await service.start(
                existing,
                'rule-1',
                'event-1',
                2,
            );

            expect(
                prisma.automationExecution.update,
            ).toHaveBeenCalledWith({
                where: {
                    id: 'execution-1',
                },
                data: {
                    status: 'RUNNING',
                    attempts: 2,
                    result: expect.anything(),
                    lastError: null,
                    completedAt: null,
                },
            });

            expect(result).toBe(execution);
        });
    });

    describe('complete', () => {
        it('marks an execution as completed', async () => {
            const execution = {
                id: 'execution-1',
                status: 'COMPLETED',
            };

            prisma.automationExecution.update.mockResolvedValue(
                execution,
            );

            const result = await service.complete(
                'execution-1',
                ['result'],
            );

            expect(
                prisma.automationExecution.update,
            ).toHaveBeenCalledWith({
                where: {
                    id: 'execution-1',
                },
                data: {
                    status: 'COMPLETED',
                    result: ['result'],
                    lastError: null,
                    completedAt: expect.any(Date),
                },
            });

            expect(result).toBe(execution);
        });
    });

    describe('fail', () => {
        it('marks an execution as failed', async () => {
            const execution = {
                id: 'execution-1',
                status: 'FAILED',
            };

            prisma.automationExecution.update.mockResolvedValue(
                execution,
            );

            const result = await service.fail(
                'execution-1',
                new Error('Webhook failed'),
            );

            expect(
                prisma.automationExecution.update,
            ).toHaveBeenCalledWith({
                where: {
                    id: 'execution-1',
                },
                data: {
                    status: 'FAILED',
                    lastError: 'Webhook failed',
                    result: {
                        error: 'Webhook failed',
                    },
                    completedAt: expect.any(Date),
                },
            });

            expect(result).toBe(execution);
        });
    });

    describe('findById', () => {
        it('returns an execution with its rule and actions', async () => {
            const execution = {
                id: 'execution-1',
                rule: {
                    id: 'rule-1',
                },
                actions: [
                    {
                        id: 'action-1',
                        actionIndex: 0,
                    },
                ],
            };

            prisma.automationExecution.findUnique.mockResolvedValue(
                execution,
            );

            const result = await service.findById(
                'execution-1',
            );

            expect(
                prisma.automationExecution.findUnique,
            ).toHaveBeenCalledWith({
                where: {
                    id: 'execution-1',
                },
                include: {
                    actions: {
                        orderBy: {
                            actionIndex: 'asc',
                        },
                    },
                    rule: true,
                },
            });

            expect(result).toBe(execution);
        });

        it('throws when the execution does not exist', async () => {
            prisma.automationExecution.findUnique.mockResolvedValue(
                null,
            );

            await expect(
                service.findById('missing'),
            ).rejects.toThrow(
                'Automation execution missing not found',
            );
        });
    });

    describe('findAll', () => {
        it('returns paginated executions with metadata', async () => {
            const executions = [
                {
                    id: 'execution-1',
                },
                {
                    id: 'execution-2',
                },
            ];

            prisma.$transaction.mockResolvedValue([
                executions,
                5,
            ]);

            const result = await service.findAll(2, 2);

            expect(result).toEqual({
                data: executions,
                meta: {
                    page: 2,
                    limit: 2,
                    total: 5,
                    totalPages: 3,
                },
            });
        });

        it('uses the expected default pagination values', async () => {
            prisma.$transaction.mockResolvedValue([
                [],
                0,
            ]);

            const result = await service.findAll();

            expect(result).toEqual({
                data: [],
                meta: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0,
                },
            });
        });

        it('filters executions by status', async () => {
            const executions = [
                {
                    id: 'execution-1',
                    status: 'FAILED',
                },
            ];

            prisma.automationExecution.findMany.mockResolvedValue(
                executions,
            );

            prisma.automationExecution.count.mockResolvedValue(1);

            prisma.$transaction.mockImplementation(
                async (queries) => Promise.all(queries),
            );

            const result = await service.findAll(
                1,
                20,
                'FAILED',
            );

            expect(
                prisma.automationExecution.findMany,
            ).toHaveBeenCalledWith({
                skip: 0,
                take: 20,
                where: {
                    status: 'FAILED',
                },
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
            });

            expect(
                prisma.automationExecution.count,
            ).toHaveBeenCalledWith({
                where: {
                    status: 'FAILED',
                },
            });

            expect(result).toEqual({
                data: executions,
                meta: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                },
            });
        });

        it('filters executions by ruleId', async () => {
            const executions = [
                {
                    id: 'execution-1',
                    ruleId: '550e8400-e29b-41d4-a716-446655440000',
                },
            ];

            prisma.automationExecution.findMany.mockResolvedValue(
                executions,
            );

            prisma.automationExecution.count.mockResolvedValue(1);

            prisma.$transaction.mockImplementation(
                async (queries) => Promise.all(queries),
            );

            const result = await service.findAll(
                1,
                20,
                undefined,
                '550e8400-e29b-41d4-a716-446655440000',
            );

            expect(
                prisma.automationExecution.findMany,
            ).toHaveBeenCalledWith({
                skip: 0,
                take: 20,
                where: {
                    ruleId:
                        '550e8400-e29b-41d4-a716-446655440000',
                },
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
            });

            expect(
                prisma.automationExecution.count,
            ).toHaveBeenCalledWith({
                where: {
                    ruleId:
                        '550e8400-e29b-41d4-a716-446655440000',
                },
            });

            expect(result).toEqual({
                data: executions,
                meta: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                },
            });
        });

        it('filters executions by status and ruleId', async () => {
            prisma.automationExecution.findMany.mockResolvedValue([]);
            prisma.automationExecution.count.mockResolvedValue(0);

            prisma.$transaction.mockImplementation(
                async (queries) => Promise.all(queries),
            );

            await service.findAll(
                1,
                10,
                'FAILED',
                '550e8400-e29b-41d4-a716-446655440000',
            );

            expect(
                prisma.automationExecution.findMany,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        status: 'FAILED',
                        ruleId:
                            '550e8400-e29b-41d4-a716-446655440000',
                    },
                }),
            );
        });
    });
});