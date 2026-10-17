
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ChatCommandAdminGuard } from '../chat-commands/chat-command-admin.guard.js';
import { TwitchService } from '../twitch/twitch.service.js';
import { CreateSongRequestDto } from './dto/create-song-request.dto.js';
import { PlaybackControllerService } from './playback-controller.service.js';
import { SongRequestService } from './song-request.service.js';
import {
  ApiCreateSongRequest,
  ApiGetSongRequestQueue,
  ApiSongRequestControllerDocs,
  ApiSkipSongRequest,
  ApiToggleSongRequestRadio,
} from './song-request.swagger.js';

@ApiSongRequestControllerDocs()
@Controller('song-request')
export class SongRequestController {
  constructor(
    private readonly songRequestService: SongRequestService,
    private readonly twitchService: TwitchService,
    private readonly playbackController: PlaybackControllerService,
  ) {}

  @Get('queue')
  @ApiGetSongRequestQueue()
  getQueue() {
    return this.songRequestService.getQueue();
  }

  @Post()
  @UseGuards(ChatCommandAdminGuard)
  @ApiCreateSongRequest()
  async createRequest(
    @Body() dto: CreateSongRequestDto,
    @Req() request: Request,
  ) {
    const session = request.session as Request['session'] & {
      twitchUserId?: string;
    };

    const requester = await this.twitchService.getAccountIdentity(
      session.twitchUserId!,
    );

    return this.songRequestService.addRequest({
      query: dto.query.trim(),
      requester,
    });
  }

  @Post('radio/toggle')
  @UseGuards(ChatCommandAdminGuard)
  @ApiToggleSongRequestRadio()
  async toggleRadio() {
    const enabled = await this.songRequestService.toggleRadio();

    return {
      enabled,
      message: enabled
        ? 'Radio started. Song requests are now enabled.'
        : 'Radio stopped. Song requests are now disabled.',
    };
  }

  @Post('skip')
  @UseGuards(ChatCommandAdminGuard)
  @ApiSkipSongRequest()
  async skip() {
    const skipped = await this.playbackController.skip();

    return {
      skipped,
      message: skipped
        ? 'Skipped the current track.'
        : 'There is no active track to skip.',
    };
  }
}
