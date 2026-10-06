import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ActionExecutorHandler } from './action-executor.interface.js';
import { WebhookAction } from '../types/action.types.js';

@Injectable()
export class WebhookExecutor
  implements ActionExecutorHandler<WebhookAction>
{
  readonly type = 'webhook' as const;

  async execute(action: WebhookAction) {
    const method = action.method ?? 'POST';

    const body = action.body ?? {};

    if (
      typeof action.url !== 'string' ||
      !action.url.trim()
    ) {
      throw new Error(
        'Webhook action requires a URL',
      );
    }
    
    const response = await axios.request({
      url: action.url,
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