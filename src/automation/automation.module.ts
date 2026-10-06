import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller.js';
import { AutomationProcessor } from './automation.processor.js';
import { AutomationService } from './automation.service.js';
import { WebhookExecutor } from './executors/webhook.executor.js';
import { ConditionEvaluator } from './condition-evaluator.service.js';
import { ActionExecutor } from './action-executor.service.js';
import { MixItUpExecutor } from './executors/mixitup.executor.js';
import { ActionParser } from './action-parser.service.js';

@Module({
  controllers: [AutomationController],
  providers: [
    AutomationService,
    AutomationProcessor,
    WebhookExecutor,
    MixItUpExecutor,
    ConditionEvaluator,
    ActionExecutor,
    ActionParser,
  ],
  exports: [AutomationProcessor],
})
export class AutomationModule {}