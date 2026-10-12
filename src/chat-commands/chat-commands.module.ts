import { Module } from '@nestjs/common';
import { ChatCommandsController } from './chat-commands.controller.js';
import { ChatCommandsService } from './chat-commands.service.js';

@Module({
  controllers: [ChatCommandsController],
  providers: [ChatCommandsService],
  exports: [ChatCommandsService],
})
export class ChatCommandsModule {}