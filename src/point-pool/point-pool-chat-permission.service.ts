import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatCommandContext } from '../commands/types/chat-command.types.js';

@Injectable()
export class PointPoolChatPermissionService {
  constructor(private readonly config: ConfigService) {}

  isAdmin(context: ChatCommandContext): boolean {
    const adminUserId =
      this.config.getOrThrow<string>('twitch.adminUserId');

    return context.user.id === adminUserId;
  }
}