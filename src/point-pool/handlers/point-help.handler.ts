import { Injectable } from '@nestjs/common';
import {
  ChatCommandContext,
  ChatCommandHandler,
} from '../../commands/types/chat-command.types.js';

@Injectable()
export class PointHelpHandler implements ChatCommandHandler {
  readonly command = 'pointhelp';

  async execute(_context: ChatCommandContext) {
    return {
      message:
        'Point Pool: !pointrank, !pointgoal, !pointhelp | Admin: !pointstart <name>, !pointend <name>, !pointgoal add <points> <description>, !pointgoal remove <id>, !pointadd <amount>, !pointremove <amount>',
    };
  }
}