import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { TwitchService } from './twitch.service.js';
import {
    ApiTwitchControllerDocs,
    ApiTwitchLogout,
    ApiTwitchOAuth,
    ApiTwitchOAuthCallback,
} from './twitch.swagger.js';

@ApiTwitchControllerDocs()
@Controller('twitch')
export class TwitchController {
    constructor(
        private readonly twitchService: TwitchService,
        private readonly config: ConfigService,
    ) {}

    @Get('oauth')
    @ApiTwitchOAuth()
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
    @ApiTwitchOAuthCallback()
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

    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTwitchLogout()
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        await new Promise<void>((resolve, reject) => {
            request.session.destroy((error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        response.clearCookie('streamops.sid', {
            httpOnly: true,
            secure: this.config.getOrThrow<boolean>(
                'session.cookieSecure',
            ),
            sameSite: 'lax',
            path: '/',
        });
    }
}