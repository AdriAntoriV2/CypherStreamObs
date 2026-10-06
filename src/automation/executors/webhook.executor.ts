import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ActionExecutorHandler } from './action-executor.interface.js';

@Injectable()
export class WebhookExecutor implements ActionExecutorHandler {
  readonly type = 'webhook' as const;
  async execute(action: Record<string, unknown>) {
    const url = action.url;

    if (typeof url !== 'string') {
      throw new Error('Webhook action requires a URL');
    }

    const method =
      typeof action.method === 'string'
        ? action.method.toUpperCase()
        : 'POST';

    const body =
      typeof action.body === 'object' &&
      action.body !== null
        ? action.body
        : {};

    const response = await axios.request({
      url,
      method,
      data: body,
      timeout: 10_000,
    });

    return {
      status: response.status,
      data: response.data,
    };
  }
}