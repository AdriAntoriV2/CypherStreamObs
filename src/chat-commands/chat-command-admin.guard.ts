import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type AuthenticatedSession = Request['session'] & {
  twitchUserId?: string;
};

@Injectable()
export class ChatCommandAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session as AuthenticatedSession;

    if (!session?.twitchUserId) {
      throw new UnauthorizedException('Login required');
    }

    const adminUserId = this.config.getOrThrow<string>(
      'twitch.adminUserId',
    );

    if (session.twitchUserId !== adminUserId) {
      throw new ForbiddenException('Administrator access required');
    }

    return true;
  }
}
