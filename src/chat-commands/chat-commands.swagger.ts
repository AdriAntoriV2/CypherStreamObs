
import { applyDecorators } from '@nestjs/common';
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
import { ChatCommandResponseDto } from './dto/chat-command-response.dto.js';

const CHAT_COMMAND_ID_EXAMPLE =
    '550e8400-e29b-41d4-a716-446655440000';

export const ApiChatCommandsControllerDocs = () =>
    applyDecorators(ApiTags('Chat Commands'));

export const ApiCreateChatCommand = () =>
    applyDecorators(
        ApiCookieAuth('streamops.sid'),
        ApiOperation({
            summary: 'Create a chat command',
        }),
        ApiCreatedResponse({
            description: 'Chat command created successfully.',
            type: ChatCommandResponseDto,
        }),
        ApiUnauthorizedResponse({
            description: 'Login required.',
        }),
        ApiForbiddenResponse({
            description: 'Administrator access required.',
        }),
    );

export const ApiListChatCommands = () =>
    applyDecorators(
        ApiOperation({
            summary: 'List chat commands',
            description:
                'Returns chat commands ordered alphabetically by name.',
        }),
        ApiOkResponse({
            description: 'Chat commands returned successfully.',
            type: ChatCommandResponseDto,
            isArray: true,
        }),
    );

export const ApiGetChatCommand = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Get a chat command',
        }),
        ApiParam({
            name: 'id',
            format: 'uuid',
            example: CHAT_COMMAND_ID_EXAMPLE,
        }),
        ApiOkResponse({
            description: 'Chat command returned successfully.',
            type: ChatCommandResponseDto,
        }),
        ApiNotFoundResponse({
            description: 'Chat command not found.',
        }),
    );

export const ApiUpdateChatCommand = () =>
    applyDecorators(
        ApiCookieAuth('streamops.sid'),
        ApiOperation({
            summary: 'Update a chat command',
        }),
        ApiParam({
            name: 'id',
            format: 'uuid',
            example: CHAT_COMMAND_ID_EXAMPLE,
        }),
        ApiOkResponse({
            description: 'Chat command updated successfully.',
            type: ChatCommandResponseDto,
        }),
        ApiUnauthorizedResponse({
            description: 'Login required.',
        }),
        ApiForbiddenResponse({
            description: 'Administrator access required.',
        }),
        ApiNotFoundResponse({
            description: 'Chat command not found.',
        }),
    );

export const ApiDeleteChatCommand = () =>
    applyDecorators(
        ApiCookieAuth('streamops.sid'),
        ApiOperation({
            summary: 'Delete a chat command',
        }),
        ApiParam({
            name: 'id',
            format: 'uuid',
            example: CHAT_COMMAND_ID_EXAMPLE,
        }),
        ApiOkResponse({
            description: 'Chat command deleted successfully.',
            type: ChatCommandResponseDto,
        }),
        ApiUnauthorizedResponse({
            description: 'Login required.',
        }),
        ApiForbiddenResponse({
            description: 'Administrator access required.',
        }),
        ApiNotFoundResponse({
            description: 'Chat command not found.',
        }),
    );
