import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import configuration from './configuration.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),

        PORT: Joi.number().port().default(3000),

        DATABASE_URL: Joi.string().uri().required(),

        REDIS_HOST: Joi.string().required(),

        REDIS_PORT: Joi.number().port().default(6379),

        //MIXITUP_HOST: Joi.string().required(),

        //MIXITUP_PORT: Joi.number().port().default(8911),
        MIXITUP_URL: Joi.string().uri().required(),

        TWITCH_CLIENT_ID: Joi.string().required(),
        TWITCH_CLIENT_SECRET: Joi.string().required(),
        TWITCH_REDIRECT_URI: Joi.string().uri().required(),
      }),
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule { }
