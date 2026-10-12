import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { PointPoolService } from './point-pool.service.js';
import { CreatePointPoolEventDto } from './dto/create-point-pool-event.dto.js';
import { ChatCommandAdminGuard } from '../chat-commands/chat-command-admin.guard.js';

@Controller('point-pool')
export class PointPoolController {
    constructor(private readonly pointPoolService: PointPoolService) { }

    @Post('events')
    @UseGuards(ChatCommandAdminGuard)
    create(@Body() dto: CreatePointPoolEventDto) {
        return this.pointPoolService.create(dto.name);
    }

    @Get('events')
    findAll() {
        return this.pointPoolService.findAll();
    }

    @Get('events/:id')
    findOne(@Param('id') id: string) {
        return this.pointPoolService.findOne(id);
    }

    @Post('events/:id/start')
    @UseGuards(ChatCommandAdminGuard)
    start(@Param('id') id: string) {
        return this.pointPoolService.start(id);
    }

    @Post('events/:id/finish')
    @UseGuards(ChatCommandAdminGuard)
    finish(@Param('id') id: string) {
        return this.pointPoolService.finish(id);
    }

    @Get('events/:id/summary')
    getSummary(@Param('id') id: string) {
        return this.pointPoolService.getSummary(id);
    }

    @Get('events/:id/redemptions')
    getRedemptions(@Param('id') id: string) {
        return this.pointPoolService.getRedemptions(id);
    }
}