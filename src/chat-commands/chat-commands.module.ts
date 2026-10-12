import { Module } from '@nestjs/common';
import { ChatCommandsController } from './chat-commands.controller.js';
import { ChatCommandsService } from './chat-commands.service.js';
import { ChatCommandAdminGuard } from './chat-command-admin.guard.js';

@Module({
  controllers: [ChatCommandsController],
  providers: [
    ChatCommandsService,
    ChatCommandAdminGuard,
  ],
  exports: [
    ChatCommandsService,
    ChatCommandAdminGuard,
  ],
})
export class ChatCommandsModule {}