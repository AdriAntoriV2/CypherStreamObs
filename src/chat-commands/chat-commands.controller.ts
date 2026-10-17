
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ChatCommandsService } from './chat-commands.service.js';
import { CreateChatCommandDto } from './dto/create-chat-command.dto.js';
import { UpdateChatCommandDto } from './dto/update-chat-command.dto.js';
import { ChatCommandAdminGuard } from './chat-command-admin.guard.js';
import {
    ApiChatCommandsControllerDocs,
    ApiCreateChatCommand,
    ApiDeleteChatCommand,
    ApiGetChatCommand,
    ApiListChatCommands,
    ApiUpdateChatCommand,
} from './chat-commands.swagger.js'

@ApiChatCommandsControllerDocs()
@Controller('chat-commands')
export class ChatCommandsController {
    constructor(
        private readonly chatCommands: ChatCommandsService,
    ) {}

    @Post()
    @UseGuards(ChatCommandAdminGuard)
    @ApiCreateChatCommand()
    create(@Body() dto: CreateChatCommandDto) {
        return this.chatCommands.create(dto);
    }

    @Get()
    @ApiListChatCommands()
    findAll() {
        return this.chatCommands.findAll();
    }

    @Get(':id')
    @ApiGetChatCommand()
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.chatCommands.findOne(id);
    }

    @Patch(':id')
    @UseGuards(ChatCommandAdminGuard)
    @ApiUpdateChatCommand()
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateChatCommandDto,
    ) {
        return this.chatCommands.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(ChatCommandAdminGuard)
    @ApiDeleteChatCommand()
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.chatCommands.remove(id);
    }
}
