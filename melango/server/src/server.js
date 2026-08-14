const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();
    // eslint-disable-next-line no-console
    console.log('[db] Connected to MongoDB');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[db] Connection failed: ${err.message}`);
    console.error('[db] The API will start anyway - database routes will fail until Mongo is up.');
  }

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Melango API listening on http://localhost:${env.port}`);
    console.log(`[server] Environment: ${env.nodeEnv} | Client origin: ${env.clientUrl}`);
  });

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received - shutting down`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('[server] Unhandled rejection:', reason);
  });
}

start();
