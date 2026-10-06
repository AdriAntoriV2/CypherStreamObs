export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in';

export type ConditionValue =
  | string
  | number
  | boolean
  | null;

export type ConditionOperatorValue =
  | ConditionValue
  | ConditionValue[];

export type ConditionExpression = Partial<
  Record<ConditionOperator, ConditionOperatorValue>
>;

export type AutomationConditions = Record<
  string,
  ConditionValue | ConditionExpression
>;