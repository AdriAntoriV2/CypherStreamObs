import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandsModule } from '../commands/commands.module.js';
import { ChatCommandsModule } from '../chat-commands/chat-commands.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { PointPoolController } from './point-pool.controller.js';
import { PointPoolService } from './point-pool.service.js';
import { PointPoolChatPermissionService } from './point-pool-chat-permission.service.js';
import { PointPoolCommandRegistration } from './point-pool-command-registration.service.js';
import { PointAddHandler } from './handlers/point-add.handler.js';
import { PointEndHandler } from './handlers/point-end.handler.js';
import { PointGoalHandler } from './handlers/point-goal.handler.js';
import { PointRankHandler } from './handlers/point-rank.handler.js';
import { PointRemoveHandler } from './handlers/point-remove.handler.js';
import { PointStartHandler } from './handlers/point-start.handler.js';
import { PointPoolCommandCooldownService } from './point-pool-command-cooldown.service.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommandsModule,
    ChatCommandsModule,
  ],
  providers: [
    PointPoolService,
    PointPoolChatPermissionService,
    PointPoolCommandRegistration,
    PointPoolCommandCooldownService,
    PointStartHandler,
    PointEndHandler,
    PointRankHandler,
    PointGoalHandler,
    PointAddHandler,
    PointRemoveHandler,
  ],
  controllers: [PointPoolController],
  exports: [PointPoolService],
})
export class PointPoolModule {}