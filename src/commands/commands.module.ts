import { Module } from '@nestjs/common';
import { CommandRouter } from './command-router.service.js';
import { ChatCommandParser } from './chat-command-parser.service.js';

@Module({
  providers: [
    CommandRouter,
    ChatCommandParser,
  ],
  exports: [
    CommandRouter,
    ChatCommandParser,
  ],
})
export class CommandsModule {}