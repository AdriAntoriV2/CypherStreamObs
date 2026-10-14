import { Module } from '@nestjs/common';
import { ChatOverlayService } from './chat-overlay.service.js';
import { ChatOverlayController } from './chat-overlay.controller.js';

@Module({
  controllers: [ChatOverlayController],
  providers: [ChatOverlayService],
  exports: [ChatOverlayService],
})
export class ChatOverlayModule {}