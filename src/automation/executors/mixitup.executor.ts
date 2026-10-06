import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ActionExecutorHandler } from './action-executor.interface.js';
import { MixItUpAction } from '../types/action.types.js';

@Injectable()
export class MixItUpExecutor
    implements ActionExecutorHandler<MixItUpAction> {
    readonly type = 'mixitup' as const;
    constructor(
        private readonly config: ConfigService,
    ) { }

    async execute(action: MixItUpAction) {
        const command = action.command;

        if (
            typeof command !== 'string' ||
            !command.trim()
        ) {
            throw new Error(
                'MixItUp action requires a command',
            );
        }

        const url =
            this.config.getOrThrow<string>(
                'mixitup.url',
            );

        const response = await axios.post(
            url,
            { command },
            { timeout: 10_000 },
        );

        return {
            status: response.status,
            data: response.data,
        };
    }
}