
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
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ChatCommandsService } from './chat-commands.service.js';
import { CreateChatCommandDto } from './dto/create-chat-command.dto.js';
import { UpdateChatCommandDto } from './dto/update-chat-command.dto.js';
import { ChatCommandResponseDto } from './dto/chat-command-response.dto.js';
import { ChatCommandAdminGuard } from './chat-command-admin.guard.js';

@ApiTags('Chat Commands')
@Controller('chat-commands')
export class ChatCommandsController {
  constructor(private readonly chatCommands: ChatCommandsService) {}

  @Post()
  @UseGuards(ChatCommandAdminGuard)
  @ApiCookieAuth('streamops.sid')
  @ApiOperation({ summary: 'Create a chat command' })
  @ApiCreatedResponse({
    description: 'Chat command created successfully.',
    type: ChatCommandResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({
    description: 'Administrator access required.',
  })
  create(@Body() dto: CreateChatCommandDto) {
    return this.chatCommands.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List chat commands',
    description: 'Returns chat commands ordered alphabetically by name.',
  })
  @ApiOkResponse({
    description: 'Chat commands returned successfully.',
    type: ChatCommandResponseDto,
    isArray: true,
  })
  findAll() {
    return this.chatCommands.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat command' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Chat command returned successfully.',
    type: ChatCommandResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Chat command not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatCommands.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ChatCommandAdminGuard)
  @ApiCookieAuth('streamops.sid')
  @ApiOperation({ summary: 'Update a chat command' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Chat command updated successfully.',
    type: ChatCommandResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({
    description: 'Administrator access required.',
  })
  @ApiNotFoundResponse({ description: 'Chat command not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChatCommandDto,
  ) {
    return this.chatCommands.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ChatCommandAdminGuard)
  @ApiCookieAuth('streamops.sid')
  @ApiOperation({ summary: 'Delete a chat command' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Chat command deleted successfully.',
    type: ChatCommandResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Login required.' })
  @ApiForbiddenResponse({
    description: 'Administrator access required.',
  })
  @ApiNotFoundResponse({ description: 'Chat command not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatCommands.remove(id);
  }
}
