import './lib/env.js';
import { app } from './app.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './services/cache.js';

if (!process.env.VITEST) {
  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  function shutdown() {
    logger.info('Shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      if (redis) await redis.quit().catch(() => {});
      process.exit(0);
    });
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
