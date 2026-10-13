import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_HOST,
});

client.on('error', (error) => {
  console.error('Redis error:', error.message);
});

try {
  await client.connect();
  console.log('Redis connected!');
  console.log('PING:', await client.ping());
} catch (error) {
  console.error('Connection failed:', error.message);
} finally {
  if (client.isOpen) {
    await client.quit();
  }
}