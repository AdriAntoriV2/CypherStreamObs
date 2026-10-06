import { Injectable } from '@nestjs/common';
import {
  AutomationConditions,
  ConditionExpression,
  ConditionValue,
} from './types/condition.types.js';

@Injectable()
export class ConditionEvaluator {
  private getNestedValue(
    payload: Record<string, unknown>,
    path: string,
  ): unknown {
    const parts = path.split('.');

    let current: unknown = payload;

    for (const part of parts) {
      if (
        typeof current !== 'object' ||
        current === null ||
        Array.isArray(current)
      ) {
        return undefined;
      }

      current = (
        current as Record<string, unknown>
      )[part];
    }

    return current;
  }

  matches(
    conditions: AutomationConditions | null,
    payload: Record<string, unknown>,
  ): boolean {

    if (!conditions) {
      return true;
    }

    for (const [field, expected] of Object.entries(
      conditions,
    )) {
      const actual = this.getNestedValue(
        payload,
        field,
      );
      if (this.isConditionExpression(expected)) {
        if (!this.matchesOperator(actual, expected)) {
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
    condition: ConditionExpression,
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
            !this.isNumber(actual) ||
            !this.isNumber(expected) ||
            actual <= expected
          ) {
            return false;
          }
          break;

        case 'gte':
          if (
            !this.isNumber(actual) ||
            !this.isNumber(expected) ||
            actual < expected
          ) {
            return false;
          }
          break;

        case 'lt':
          if (
            !this.isNumber(actual) ||
            !this.isNumber(expected) ||
            actual >= expected
          ) {
            return false;
          }
          break;

        case 'lte':
          if (
            !this.isNumber(actual) ||
            !this.isNumber(expected) ||
            actual > expected
          ) {
            return false;
          }
          break;

        case 'in':
          if (
            !Array.isArray(expected) ||
            !expected.includes(actual as ConditionValue)
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

  private isConditionExpression(
    value: ConditionValue | ConditionExpression,
  ): value is ConditionExpression {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }

  private isNumber(
    value: unknown,
  ): value is number {
    return typeof value === 'number';
  }
}