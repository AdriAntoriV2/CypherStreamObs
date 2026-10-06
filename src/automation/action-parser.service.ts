import { Injectable } from '@nestjs/common';
import {
  AutomationAction,
  MixItUpAction,
  WebhookAction,
} from './types/action.types.js';

@Injectable()
export class ActionParser {
  parse(value: unknown): AutomationAction {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
    ) {
      throw new Error(
        'Automation action must be an object',
      );
    }

    const action = value as Record<string, unknown>;

    if (action.type === 'webhook') {
      return this.parseWebhook(action);
    }

    if (action.type === 'mixitup') {
      return this.parseMixItUp(action);
    }

    throw new Error(
      `Unsupported automation action type: ${String(action.type)}`,
    );
  }

  private parseWebhook(
    action: Record<string, unknown>,
  ): WebhookAction {
    if (
      typeof action.url !== 'string' ||
      !action.url.trim()
    ) {
      throw new Error(
        'Webhook action requires a URL',
      );
    }

    if (
      action.method !== undefined &&
      !this.isHttpMethod(action.method)
    ) {
      throw new Error(
        'Webhook action has an invalid HTTP method',
      );
    }

    if (
      action.body !== undefined &&
      (
        typeof action.body !== 'object' ||
        action.body === null ||
        Array.isArray(action.body)
      )
    ) {
      throw new Error(
        'Webhook action body must be an object',
      );
    }

    return {
      type: 'webhook',
      url: action.url,
      method: action.method,
      body: action.body as Record<string, unknown> | undefined,
    };
  }

  private parseMixItUp(
    action: Record<string, unknown>,
  ): MixItUpAction {
    if (
      typeof action.command !== 'string' ||
      !action.command.trim()
    ) {
      throw new Error(
        'MixItUp action requires a command',
      );
    }

    return {
      type: 'mixitup',
      command: action.command,
    };
  }

  private isHttpMethod(
    value: unknown,
  ): value is NonNullable<WebhookAction['method']> {
    return (
      value === 'GET' ||
      value === 'POST' ||
      value === 'PUT' ||
      value === 'PATCH' ||
      value === 'DELETE'
    );
  }
}