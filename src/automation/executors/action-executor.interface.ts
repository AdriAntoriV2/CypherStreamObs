import { AutomationAction } from '../types/action.types.js';

export type ActionExecutorType = AutomationAction['type'];

export interface ActionExecutorHandler<
  TAction extends AutomationAction = AutomationAction,
> {
  readonly type: TAction['type'];

  execute(action: TAction): Promise<unknown>;
}