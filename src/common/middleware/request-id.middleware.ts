import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    const requestId =
      request.header('x-request-id') ?? randomUUID();

    response.setHeader('x-request-id', requestId);

    request.requestId = requestId;

    next();
  }
}