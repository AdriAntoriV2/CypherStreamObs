
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { AppModule } from './app.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const sessionRedis = createClient({
    url: config.getOrThrow<string>('redis.url'),
  });

  sessionRedis.on('error', (error) => {
    console.error('Session Redis error:', error);
  });

  await sessionRedis.connect();

  app.setGlobalPrefix('api');

  app.use(
    session({
      name: 'streamops.sid',
      store: new RedisStore({ client: sessionRedis }),
      secret: config.getOrThrow<string>('session.secret'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.getOrThrow<boolean>('session.cookieSecure'),
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

  await app.listen(config.getOrThrow<number>('server.port'));
}

bootstrap();
