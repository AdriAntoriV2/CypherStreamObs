
import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { AddressInfo } from 'node:net';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';

import { AppModule } from './app.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const startedAt = Date.now();

  let sessionRedis: ReturnType<typeof createClient> | undefined;

  try {
    logger.log('Starting StreamOps...');
    logger.log(`PID: ${process.pid}`);
    logger.log(`NODE_ENV: ${process.env.NODE_ENV ?? 'not set'}`);
    logger.log(`Environment PORT: ${process.env.PORT ?? 'not set'}`);

    logger.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule);

    const config = app.get(ConfigService);
    const port = config.getOrThrow<number>('server.port');

    logger.log(`Configured server.port: ${port}`);

    app.setGlobalPrefix('api');

    /*
    // Log HTTP requests and responses without logging credentials or cookies.
    app.use((req: { method: any; originalUrl: any; }, res: { on: (arg0: string, arg1: { (): void; (): void; }) => void; statusCode: any; }, next: () => void) => {
      const requestLogger = new Logger('HTTP');
      const started = Date.now();
      const requestId = `${process.pid}-${started}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      requestLogger.log(
        `[${requestId}] --> ${req.method} ${req.originalUrl}`,
      );

      let completed = false;

      res.on('finish', () => {
        completed = true;

        requestLogger.log(
          `[${requestId}] <-- ${req.method} ${req.originalUrl} ` +
            `${res.statusCode} (${Date.now() - started}ms)`,
        );
      });

      res.on('close', () => {
        if (!completed) {
          requestLogger.warn(
            `[${requestId}] Connection closed before response finished: ` +
              `${req.method} ${req.originalUrl} ` +
              `(${Date.now() - started}ms)`,
          );
        }
      });

      next();
    });
    */

    logger.log('Configuring Swagger...');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('StreamOps API')
      .setDescription(
        'Backend API for StreamOps, a Twitch streaming automation and overlay platform.',
      )
      .setVersion('1.0')
      .addServer('/api')
      .addCookieAuth(
        'streamops.sid',
        {
          type: 'apiKey',
          in: 'cookie',
          name: 'streamops.sid',
        },
        'streamops.sid',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(
      app,
      swaggerConfig,
    );

    SwaggerModule.setup('docs', app, swaggerDocument);

    logger.log('Connecting to session Redis...');
    sessionRedis = createClient({
      url: config.getOrThrow<string>('redis.url'),
    });

    sessionRedis.on('error', (error: Error) => {
      logger.error(
        `Session Redis error: ${error.message}`,
        error.stack,
      );
    });

    await sessionRedis.connect();
    logger.log('Session Redis connected.');

    logger.log('Configuring session middleware...');
    app.use(
      session({
        name: 'streamops.sid',
        store: new RedisStore({ client: sessionRedis }),
        secret: config.getOrThrow<string>('session.secret'),
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: config.getOrThrow<boolean>(
            'session.cookieSecure',
          ),
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        },
      }),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.useGlobalFilters(new PrismaExceptionFilter());

    logger.log(`Starting HTTP listener on port ${port}...`);
    await app.listen(port);

    const address = app.getHttpServer().address() as
      | AddressInfo
      | string
      | null;

    const actualPort =
      address && typeof address !== 'string'
        ? address.port
        : port;

    const host =
      address && typeof address !== 'string'
        ? address.address
        : 'unknown';

    logger.log('========================================');
    logger.log('StreamOps started successfully.');
    logger.log(`PID: ${process.pid}`);
    logger.log(`Configured port: ${port}`);
    logger.log(`Actual listening port: ${actualPort}`);
    logger.log(`Bound address: ${host}`);
    logger.log(`Local URL: http://localhost:${actualPort}`);
    logger.log(`API base: http://localhost:${actualPort}/api`);
    logger.log(`Swagger UI: http://localhost:${actualPort}/docs`);
    logger.log(`Startup time: ${Date.now() - startedAt}ms`);
    logger.log('========================================');
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error(`StreamOps failed to start: ${message}`, stack);

    if (sessionRedis?.isOpen) {
      try {
        await sessionRedis.quit();
      } catch (redisError: unknown) {
        logger.error(
          `Failed to close Redis connection: ${
            redisError instanceof Error
              ? redisError.message
              : String(redisError)
          }`,
        );
      }
    }

    process.exitCode = 1;
  }
}

bootstrap();
