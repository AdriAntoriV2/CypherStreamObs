import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { TwitchService } from './twitch.service.js';
import type { Request } from 'express';

@Controller('twitch')
export class TwitchController {
    constructor(
        private readonly twitchService: TwitchService,
    ) { }


    @Get('oauth')
    async authorize(
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const { url, state } =
            await this.twitchService.getAuthorizationUrl();

        const session = request.session as Request['session'] & {
            twitchOAuthState?: string;
        };

        session.twitchOAuthState = state;

        await new Promise<void>((resolve, reject) => {
            request.session.save((error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        return response.redirect(url);
    }

    @Get('oauth/callback')
    async callback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Req() request: Request,
    ) {
        const session = request.session as Request['session'] & {
            twitchOAuthState?: string;
        };

        if (
            !session.twitchOAuthState ||
            session.twitchOAuthState !== state
        ) {
            throw new UnauthorizedException(
                'OAuth state does not match the initiating session',
            );
        }

        delete session.twitchOAuthState;

        const account =
            await this.twitchService.handleOAuthCallback(code, state);

        // Prevent session fixation after successful OAuth.
        await new Promise<void>((resolve, reject) => {
            request.session.regenerate((error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        const authenticatedSession = request.session as Request['session'] & {
            twitchUserId?: string;
        };

        authenticatedSession.twitchUserId = account.twitchUserId;

        await new Promise<void>((resolve, reject) => {
            request.session.save((error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        return account;
    }
}