import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller.js';
import { AutomationProcessor } from './automation.processor.js';
import { AutomationService } from './automation.service.js';
import { WebhookExecutor } from './executors/webhook.executor.js';

@Module({
  controllers: [AutomationController],
  providers: [
    AutomationService,
    AutomationProcessor,
    WebhookExecutor,
  ],
  exports: [AutomationProcessor],
})
export class AutomationModule {}