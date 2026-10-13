export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  server: {
    port: Number(process.env.PORT ?? 3000),
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  // mixitup: {
  //   url:
  //     process.env.MIXITUP_URL ??
  //     'http://127.0.0.1:8911',
  // },

  session: {
    secret: process.env.SESSION_SECRET,
    cookieSecure: process.env.NODE_ENV === 'production',
  },

  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret:
      process.env.TWITCH_CLIENT_SECRET,
    redirectUri:
      process.env.TWITCH_REDIRECT_URI ??
      'http://localhost:3000/api/twitch/oauth/callback',
    tokenEncryptionKey:
      process.env.TWITCH_TOKEN_ENCRYPTION_KEY,
    scopes: [
      'user:read:chat',
      'user:write:chat',
      'moderator:read:followers',
      'channel:read:subscriptions',
      'bits:read',
      'channel:read:redemptions',
    ],
    adminUserId: process.env.TWITCH_ADMIN_USER_ID,
  },

  songRequest: {
    queueLimit: Number(process.env.SONG_REQUEST_QUEUE_LIMIT ?? 10),
  },

  playback: {
    mpvPath: process.env.MPV_PATH ?? 'mpv',
    ipcPath:
      process.env.MPV_IPC_PATH ??
      (process.platform === 'win32'
        ? '\\\\.\\pipe\\streamops-mpv'
        : '/tmp/streamops-mpv.sock'),
    radioUrl: process.env.RADIO_URL,
  },
});