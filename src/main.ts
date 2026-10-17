import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { AppModule } from './app.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('StreamOps API')
    .setDescription(
      'Backend API for StreamOps, a Twitch streaming automation and overlay platform.',
    )
    .setVersion('1.0')
    .addServer('/api')
    .addCookieAuth('streamops.sid', {
      type: 'apiKey',
      in: 'cookie',
      name: 'streamops.sid',
    }, 'streamops.sid')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  SwaggerModule.setup('docs', app, swaggerDocument);

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