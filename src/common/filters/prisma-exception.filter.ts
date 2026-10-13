import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database operation failed';
    let error = 'Internal Server Error';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        error = 'Conflict';
        break;

      case 'P2003':
        status = HttpStatus.NOT_FOUND;
        message = 'Referenced resource was not found';
        error = 'Not Found';
        break;

      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found';
        error = 'Not Found';
        break;
    }

    response.status(status).json({
        statusCode: status,
        error,
        message,
        path: request.url,
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
    });
  }
}