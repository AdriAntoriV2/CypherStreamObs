export interface WebhookAction {
  type: 'webhook';
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
}

export interface MixItUpAction {
  type: 'mixitup';
  command: string;
}

export type AutomationAction =
  | WebhookAction
  | MixItUpAction;