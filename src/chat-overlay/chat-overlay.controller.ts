
import { Controller, Get } from '@nestjs/common';

import { ChatOverlayService } from './chat-overlay.service.js';
import {
    ApiChatOverlayControllerDocs,
    ApiGetRecentChatMessages,
} from './chat-overlay.swagger.js';

@ApiChatOverlayControllerDocs()
@Controller('chat-overlay')
export class ChatOverlayController {
    constructor(
        private readonly chatOverlayService: ChatOverlayService,
    ) {}

    @Get('recent')
    @ApiGetRecentChatMessages()
    async getRecentMessages() {
        return this.chatOverlayService.getRecentMessages();
    }
}
