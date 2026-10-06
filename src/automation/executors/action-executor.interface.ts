export type ActionExecutorType =
  | 'webhook'
  | 'mixitup';

export interface ActionExecutorHandler {
  execute(
    action: Record<string, unknown>,
  ): Promise<unknown>;
}