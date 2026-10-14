import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandRouter } from '../commands/command-router.service.js';
import { ShoutoutHandler } from '../commands/handlers/shoutout.handler.js';

@Injectable()
export class TwitchCommandRegistration implements OnModuleInit {
  constructor(
    private readonly router: CommandRouter,
    private readonly shoutoutHandler: ShoutoutHandler,
  ) {}

  onModuleInit(): void {
    this.router.register(this.shoutoutHandler);
  }
}