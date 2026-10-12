
import { Module } from '@nestjs/common';
import { ChatCommandDispatcher } from './chat-command-dispatcher.service.js';
import { ChatCommandParser } from './chat-command-parser.service.js';
import { CommandRouter } from './command-router.service.js';
import { ChatCommandsModule } from '../chat-commands/chat-commands.module.js';

@Module({
  imports: [ChatCommandsModule],
  providers: [
    ChatCommandParser,
    CommandRouter,
    ChatCommandDispatcher,
  ],
  exports: [
    ChatCommandParser,
    CommandRouter,
    ChatCommandDispatcher,
  ],
})
export class CommandsModule {}
