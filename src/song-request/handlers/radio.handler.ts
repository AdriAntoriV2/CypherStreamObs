import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChatCommandContext,
  ChatCommandHandler,
} from '../../commands/types/chat-command.types.js';
import { SongRequestService } from '../song-request.service.js';

@Injectable()
export class RadioHandler implements ChatCommandHandler {
  readonly command = 'radio';

  constructor(
    private readonly songRequests: SongRequestService,
    private readonly configService: ConfigService,
  ) {}

  async execute(context: ChatCommandContext) {
    const adminUserId =
      this.configService.getOrThrow<string>(
        'twitch.adminUserId',
      );

    if (context.user.id !== adminUserId) {
      return {
        ok: false,
        message: 'Only the broadcaster can use !radio.',
      };
    }

    try {
      const enabled = await this.songRequests.toggleRadio();

      return {
        ok: true,
        message: enabled
          ? 'Radio started. Song requests are now enabled.'
          : 'Radio stopped. Song requests are now disabled.',
      };
    } catch (error) {
      return {
        ok: false,
        message: `Unable to change radio mode: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}