import { Injectable } from '@nestjs/common';
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
  ) {}

  async execute(_context: ChatCommandContext) {
    try {
      const enabled = await this.songRequests.toggleRadio();

      return {
        ok: true,
        message: enabled
          ? 'Radio started. Song requests are now enabled. Use !sr <query> to request a song.'
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