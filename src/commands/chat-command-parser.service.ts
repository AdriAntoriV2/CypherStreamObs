import { Injectable } from '@nestjs/common';

export interface ParsedChatCommand {
  command: string;
  args: string[];
}

@Injectable()
export class ChatCommandParser {
  parse(
    message: string,
  ): ParsedChatCommand | null {
    const trimmed =
      message.trim();

    if (!trimmed.startsWith('!')) {
      return null;
    }

    const parts =
      trimmed.split(/\s+/);

    const command =
      parts[0]
        .slice(1)
        .toLowerCase();

    if (!command) {
      return null;
    }

    return {
      command,
      args: parts.slice(1),
    };
  }
}