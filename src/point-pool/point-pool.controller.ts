
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';

import { ChatCommandAdminGuard } from '../chat-commands/chat-command-admin.guard.js';
import { CreatePointPoolEventDto } from './dto/create-point-pool-event.dto.js';
import { PointPoolService } from './point-pool.service.js';

import {
    ApiCreatePointPoolEvent,
    ApiFinishPointPoolEvent,
    ApiGetActivePointPoolProgress,
    ApiGetPointPoolEvent,
    ApiGetPointPoolEventSummary,
    ApiListPointPoolEvents,
    ApiListPointPoolRedemptions,
    ApiPointPoolControllerDocs,
    ApiStartPointPoolEvent,
} from './point-pool.swagger.js';

@ApiPointPoolControllerDocs()
@Controller('point-pool')
export class PointPoolController {
    constructor(
        private readonly pointPoolService: PointPoolService,
    ) {}

    @Post('events')
    @UseGuards(ChatCommandAdminGuard)
    @ApiCreatePointPoolEvent()
    create(@Body() dto: CreatePointPoolEventDto) {
        return this.pointPoolService.create(dto.name);
    }

    @Get('events')
    @ApiListPointPoolEvents()
    findAll() {
        return this.pointPoolService.findAll();
    }

    @Get('active/progress')
    @ApiGetActivePointPoolProgress()
    getActiveProgress() {
        return this.pointPoolService.getActiveProgress();
    }

    @Get('events/:id')
    @ApiGetPointPoolEvent()
    findOne(@Param('id') id: string) {
        return this.pointPoolService.findOne(id);
    }

    @Post('events/:id/start')
    @UseGuards(ChatCommandAdminGuard)
    @ApiStartPointPoolEvent()
    start(@Param('id') id: string) {
        return this.pointPoolService.start(id);
    }

    @Post('events/:id/finish')
    @UseGuards(ChatCommandAdminGuard)
    @ApiFinishPointPoolEvent()
    finish(@Param('id') id: string) {
        return this.pointPoolService.finish(id);
    }

    @Get('events/:id/summary')
    @ApiGetPointPoolEventSummary()
    getSummary(@Param('id') id: string) {
        return this.pointPoolService.getSummary(id);
    }

    @Get('events/:id/redemptions')
    @ApiListPointPoolRedemptions()
    getRedemptions(@Param('id') id: string) {
        return this.pointPoolService.getRedemptions(id);
    }
}
