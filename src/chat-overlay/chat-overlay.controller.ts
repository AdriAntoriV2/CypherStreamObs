import { Controller, Get } from '@nestjs/common';
import { ChatOverlayService } from './chat-overlay.service.js';

@Controller('chat-overlay')
export class ChatOverlayController {
  constructor(
    private readonly chatOverlayService: ChatOverlayService,
  ) {}

  @Get('recent')
  async getRecentMessages() {
    return this.chatOverlayService.getRecentMessages();
  }
}