/* Start API with in-memory MongoDB for local dev when MongoDB is not installed. */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

let mongo;

async function main() {
  mongo = await MongoMemoryServer.create();
  const uri = `${mongo.getUri()}melango`;
  process.env.MONGO_URI = uri;
  process.env.PORT = process.env.PORT || '5001';

  console.log(`[dev] In-memory MongoDB at ${uri}`);

  const seed = spawn(process.execPath, [path.join(__dirname, 'src/seed.js')], {
    env: { ...process.env, MONGO_URI: uri },
    stdio: 'inherit',
  });

  await new Promise((resolve, reject) => {
    seed.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  });

  require('./src/server.js');
}

const shutdown = async () => {
  if (mongo) await mongo.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('[dev] Failed to start:', err.message);
  process.exit(1);
});
