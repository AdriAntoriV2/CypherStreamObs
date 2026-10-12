import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ChatCommandsService } from './chat-commands.service.js';
import { CreateChatCommandDto } from './dto/create-chat-command.dto.js';
import { UpdateChatCommandDto } from './dto/update-chat-command.dto.js';
import { UseGuards } from '@nestjs/common';
import { ChatCommandAdminGuard } from './chat-command-admin.guard.js';

@Controller('chat-commands')
export class ChatCommandsController {
  constructor(private readonly chatCommands: ChatCommandsService) { }

  @Post()
  @UseGuards(ChatCommandAdminGuard)
  create(@Body() dto: CreateChatCommandDto) {
    return this.chatCommands.create(dto);
  }

  @Get()
  findAll() {
    return this.chatCommands.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatCommands.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ChatCommandAdminGuard)

  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChatCommandDto,
  ) {
    return this.chatCommands.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ChatCommandAdminGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatCommands.remove(id);
  }
}