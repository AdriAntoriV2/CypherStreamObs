
import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateSongRequestDto } from './dto/create-song-request.dto.js';

export const ApiSongRequestControllerDocs = () =>
  applyDecorators(ApiTags('Song Request'));

export const ApiGetSongRequestQueue = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the song request queue',
      description:
        'Returns the current track, pending requests, and configured queue limit.',
    }),
    ApiOkResponse({
      description: 'Song request queue returned successfully.',
      schema: {
        type: 'object',
        properties: {
          current: {
            nullable: true,
            type: 'object',
            description: 'Currently playing request, or null.',
          },
          pending: {
            type: 'array',
            items: { type: 'object' },
            description: 'Pending requests in queue order.',
          },
          limit: {
            type: 'number',
            example: 10,
          },
        },
        required: ['current', 'pending', 'limit'],
      },
    }),
  );

export const ApiCreateSongRequest = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a song request',
      description:
        'Submits a song request on behalf of the authenticated channel owner.',
    }),
    ApiBody({ type: CreateSongRequestDto }),
    ApiCreatedResponse({
      description: 'Song request accepted for resolution.',
    }),
    ApiBadRequestResponse({
      description: 'The request query is invalid.',
    }),
    ApiConflictResponse({
      description:
        'Radio is disabled or the request queue is full.',
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication is required.',
    }),
    ApiForbiddenResponse({
      description: 'Only the configured channel owner may submit requests.',
    }),
  );

export const ApiToggleSongRequestRadio = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Toggle radio mode',
      description:
        'Enables radio and song requests, or disables playback and clears the queue.',
    }),
    ApiOkResponse({
      description: 'Radio mode changed successfully.',
      schema: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example:
              'Radio started. Song requests are now enabled.',
          },
        },
        required: ['enabled', 'message'],
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication is required.',
    }),
    ApiForbiddenResponse({
      description: 'Only the configured channel owner may toggle radio.',
    }),
  );

export const ApiSkipSongRequest = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Skip the current track',
      description:
        'Stops the current track and advances playback to the next request, matching !skip.',
    }),
    ApiOkResponse({
      description: 'Skip operation completed.',
      schema: {
        type: 'object',
        properties: {
          skipped: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Skipped the current track.',
          },
        },
        required: ['skipped', 'message'],
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication is required.',
    }),
    ApiForbiddenResponse({
      description: 'Only the configured channel owner may skip tracks.',
    }),
  );
