import { Injectable } from '@nestjs/common';
import type { ChatCommandContext, ChatCommandHandler } from '../../commands/types/chat-command.types.js';
import { PlaybackControllerService } from '../playback-controller.service.js';

@Injectable()
export class SkipHandler implements ChatCommandHandler {
  readonly command = 'skip';
  constructor(
    private readonly playbackController: PlaybackControllerService,
  ) {}

  async execute(_context: ChatCommandContext) {
    const skipped = await this.playbackController.skip();

    if (!skipped) {
      return {
        ok: false,
        message: 'There is no active track to skip.',
      };
    }

    return {
      ok: true,
      message: 'Skipped the current track.',
    };
  }
}