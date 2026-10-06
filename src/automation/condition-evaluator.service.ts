import { Injectable } from '@nestjs/common';

@Injectable()
export class ConditionEvaluator {
  matches(
    conditions: unknown,
    payload: Record<string, unknown>,
  ): boolean {
    if (
      conditions === null ||
      typeof conditions !== 'object' ||
      Array.isArray(conditions)
    ) {
      return true;
    }

    for (const [field, expected] of Object.entries(
      conditions,
    )) {
      const actual = payload[field];

      if (
        typeof expected === 'object' &&
        expected !== null &&
        !Array.isArray(expected)
      ) {
        if (
          !this.matchesOperator(
            actual,
            expected as Record<string, unknown>,
          )
        ) {
          return false;
        }

        continue;
      }

      if (actual !== expected) {
        return false;
      }
    }

    return true;
  }

  private matchesOperator(
    actual: unknown,
    condition: Record<string, unknown>,
  ): boolean {
    for (const [operator, expected] of Object.entries(
      condition,
    )) {
      switch (operator) {
        case 'eq':
          if (actual !== expected) {
            return false;
          }
          break;

        case 'neq':
          if (actual === expected) {
            return false;
          }
          break;

        case 'gt':
          if (
            typeof actual !== 'number' ||
            typeof expected !== 'number' ||
            actual <= expected
          ) {
            return false;
          }
          break;

        case 'gte':
          if (
            typeof actual !== 'number' ||
            typeof expected !== 'number' ||
            actual < expected
          ) {
            return false;
          }
          break;

        case 'lt':
          if (
            typeof actual !== 'number' ||
            typeof expected !== 'number' ||
            actual >= expected
          ) {
            return false;
          }
          break;

        case 'lte':
          if (
            typeof actual !== 'number' ||
            typeof expected !== 'number' ||
            actual > expected
          ) {
            return false;
          }
          break;

        case 'in':
          if (
            !Array.isArray(expected) ||
            !expected.includes(actual)
          ) {
            return false;
          }
          break;

        default:
          throw new Error(
            `Unsupported condition operator: ${operator}`,
          );
      }
    }

    return true;
  }
}