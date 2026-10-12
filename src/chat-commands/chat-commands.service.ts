import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateChatCommandDto } from './dto/create-chat-command.dto.js';
import { UpdateChatCommandDto } from './dto/update-chat-command.dto.js';
import { ChatCommandContext } from '../commands/types/chat-command.types.js';

@Injectable()
export class ChatCommandsService {
    constructor(private readonly prisma: PrismaService) { }

    create(dto: CreateChatCommandDto) {
        const name = dto.name.toLowerCase();

        return this.prisma.chatCommand.create({
            data: {
                name,
                response: dto.response,
                cooldownSeconds: dto.cooldownSeconds,
            },
        });
    }

    findAll() {
        return this.prisma.chatCommand.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const command = await this.prisma.chatCommand.findUnique({
            where: { id },
        });

        if (!command) {
            throw new NotFoundException('Chat command not found');
        }

        return command;
    }

    async update(id: string, dto: UpdateChatCommandDto) {
        await this.findOne(id);

        return this.prisma.chatCommand.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.chatCommand.delete({
            where: { id },
        });
    }

    private readonly cooldowns = new Map<string, number>();

    async executeCustom(
        context: ChatCommandContext,
    ): Promise<{ message: string } | null> {
        const command = await this.prisma.chatCommand.findUnique({
            where: { name: context.command },
        });

        if (!command || !command.enabled) {
            return null;
        }

        const cooldownKey = `${command.id}:${context.user.id}`;
        const now = Date.now();
        const nextAllowedAt = this.cooldowns.get(cooldownKey) ?? 0;

        if (now < nextAllowedAt) {
            return null;
        }

        if (command.cooldownSeconds > 0) {
            this.cooldowns.set(
                cooldownKey,
                now + command.cooldownSeconds * 1000,
            );
        }

        return { message: command.response };
    }
}