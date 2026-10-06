import {
  Injectable,
} from '@nestjs/common';
import {
  ActionExecutorHandler,
  ActionExecutorType,
} from './executors/action-executor.interface.js';
import { WebhookExecutor } from './executors/webhook.executor.js';
import { MixItUpExecutor } from './executors/mixitup.executor.js';

@Injectable()
export class ActionExecutor {
  private readonly executors: Map<
    ActionExecutorType,
    ActionExecutorHandler
  >;

  constructor(
    webhookExecutor: WebhookExecutor,
    mixItUpExecutor: MixItUpExecutor,
  ) {
    this.executors = new Map<
      ActionExecutorType,
      ActionExecutorHandler
    >([
      ['webhook', webhookExecutor],
      ['mixitup', mixItUpExecutor],
    ]);
  }

  async execute(
    action: Record<string, unknown>,
  ): Promise<unknown> {
    const type = action.type;

    if (typeof type !== 'string') {
      throw new Error(
        'Automation action requires a type',
      );
    }

    const executor =
      this.executors.get(
        type as ActionExecutorType,
      );

    if (!executor) {
      throw new Error(
        `Unsupported automation action type: ${type}`,
      );
    }

    return executor.execute(action);
  }
}