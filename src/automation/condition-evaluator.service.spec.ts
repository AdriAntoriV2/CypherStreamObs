import { describe, expect, it } from 'vitest';
import { ConditionEvaluator } from './condition-evaluator.service.js';

describe('ConditionEvaluator', () => {
    const evaluator = new ConditionEvaluator();
    it('should match a nested field', () => {
        expect(
            evaluator.matches(
                {
                    'user.login': 'cypherusuh',
                },
                {
                    user: {
                        login: 'cypherusuh',
                    },
                },
            ),
        ).toBe(true);
    });

    it('should match an operator against a nested field', () => {
        expect(
            evaluator.matches(
                {
                    'stats.viewerCount': {
                        gte: 100,
                    },
                },
                {
                    stats: {
                        viewerCount: 250,
                    },
                },
            ),
        ).toBe(true);
    });

    it('should return false when a nested field does not exist', () => {
        expect(
            evaluator.matches(
                {
                    'user.login': 'cypherusuh',
                },
                {
                    user: {
                        displayName: 'Cypherusuh',
                    },
                },
            ),
        ).toBe(false);
    });

    it('should return false when a nested path crosses a non-object value', () => {
        expect(
            evaluator.matches(
                {
                    'user.login.name': 'cypherusuh',
                },
                {
                    user: {
                        login: 'cypherusuh',
                    },
                },
            ),
        ).toBe(false);
    });

    it('should match a simple equality condition', () => {
        expect(
            evaluator.matches(
                {
                    username: 'cypherusuh',
                },
                {
                    username: 'cypherusuh',
                },
            ),
        ).toBe(true);
    });

    it('should reject a simple equality condition when values differ', () => {
        expect(
            evaluator.matches(
                {
                    username: 'cypherusuh',
                },
                {
                    username: 'someone-else',
                },
            ),
        ).toBe(false);
    });

    it('should match eq operator', () => {
        expect(
            evaluator.matches(
                {
                    username: {
                        eq: 'cypherusuh',
                    },
                },
                {
                    username: 'cypherusuh',
                },
            ),
        ).toBe(true);
    });

    it('should match neq operator', () => {
        expect(
            evaluator.matches(
                {
                    username: {
                        neq: 'someone-else',
                    },
                },
                {
                    username: 'cypherusuh',
                },
            ),
        ).toBe(true);
    });

    it('should match numeric comparison operators', () => {
        const payload = {
            viewerCount: 500,
        };

        expect(
            evaluator.matches(
                { viewerCount: { gt: 100 } },
                payload,
            ),
        ).toBe(true);

        expect(
            evaluator.matches(
                { viewerCount: { gte: 500 } },
                payload,
            ),
        ).toBe(true);

        expect(
            evaluator.matches(
                { viewerCount: { lt: 1000 } },
                payload,
            ),
        ).toBe(true);

        expect(
            evaluator.matches(
                { viewerCount: { lte: 500 } },
                payload,
            ),
        ).toBe(true);
    });

    it('should reject numeric comparisons when the type is wrong', () => {
        expect(
            evaluator.matches(
                {
                    viewerCount: {
                        gt: 100,
                    },
                },
                {
                    viewerCount: '500',
                },
            ),
        ).toBe(false);
    });

    it('should match the in operator', () => {
        expect(
            evaluator.matches(
                {
                    username: {
                        in: ['alice', 'bob', 'cypherusuh'],
                    },
                },
                {
                    username: 'cypherusuh',
                },
            ),
        ).toBe(true);
    });

    it('should reject values not present in in', () => {
        expect(
            evaluator.matches(
                {
                    username: {
                        in: ['alice', 'bob'],
                    },
                },
                {
                    username: 'cypherusuh',
                },
            ),
        ).toBe(false);
    });

    it('should match multiple fields', () => {
        expect(
            evaluator.matches(
                {
                    username: 'cypherusuh',
                    viewerCount: {
                        gte: 100,
                    },
                },
                {
                    username: 'cypherusuh',
                    viewerCount: 250,
                },
            ),
        ).toBe(true);
    });

    it('should return true when there are no conditions', () => {
        expect(
            evaluator.matches(null, {
                username: 'cypherusuh',
            }),
        ).toBe(true);
    });

    it('should throw for an unsupported operator', () => {
        expect(() =>
            evaluator.matches(
                {
                    username: {
                        startsWith: 'cypher',
                    } as any,
                },
                {
                    username: 'cypherusuh',
                },
            ),
        ).toThrow(
            'Unsupported condition operator: startsWith',
        );
    });
});