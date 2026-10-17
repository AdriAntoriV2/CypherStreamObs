
import { applyDecorators } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

export const ApiEventsControllerDocs = () =>
    applyDecorators(ApiTags('Events'));

export const ApiCreateEvent = () =>
    applyDecorators(
        ApiOperation({
            summary: 'Create a stream event',
            description:
                'Persists a stream event and queues it for downstream processing. ' +
                'If an event with the same externalId already exists, returns that event.',
        }),
        ApiCreatedResponse({
            description: 'Event created or an existing event returned.',
        }),
        ApiBadRequestResponse({
            description: 'The request body failed validation.',
        }),
    );
