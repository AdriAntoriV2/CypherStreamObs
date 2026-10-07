export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  server: {
    port: Number(process.env.PORT ?? 3000),
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },

  // mixitup: {
  //   host: process.env.MIXITUP_HOST ?? '127.0.0.1',
  //   port: Number(process.env.MIXITUP_PORT ?? 8911),
  // },
  mixitup: {
    url:
      process.env.MIXITUP_URL ??
      'http://127.0.0.1:8911',
  },

  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri:
      process.env.TWITCH_REDIRECT_URI ??
      'http://localhost:3000/api/twitch/oauth/callback',
  },
});