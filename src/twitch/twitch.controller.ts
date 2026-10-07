import {
    BadRequestException,
    Controller,
    Get,
    Query,
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { TwitchService } from './twitch.service.js';

@Controller('twitch')
export class TwitchController {
    constructor(
        private readonly twitchService: TwitchService,
    ) { }

    @Get('oauth')
    async authorize(
        @Res() response: Response,
    ) {
        return response.redirect(
            await this.twitchService.getAuthorizationUrl(),
        );
    }

    @Get('oauth/callback')
    async callback(
        @Query('code') code: string,
        @Query('state') state: string,
    ) {
        if (!code || !state) {
            throw new BadRequestException(
                'Missing Twitch OAuth parameters',
            );
        }

        return this.twitchService
            .handleOAuthCallback(
                code,
                state,
            );
    }
}