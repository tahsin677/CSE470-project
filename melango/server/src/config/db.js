const mongoose = require('mongoose');
const env = require('./env');

let memoryServer;

async function connectLocalMongo() {
  return mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 2500,
  });
}

async function connectMemoryMongo() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri('melango');
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
}

async function ensureDemoUsers() {
  const User = require('../models/User');
  const count = await User.countDocuments();
  if (count > 0) return;

  await User.create([
    { name: 'Melango Admin', email: 'admin@melango.com', password: 'Admin123!', role: 'admin' },
    { name: 'Melango Teacher', email: 'teacher@melango.com', password: 'Teacher123!', role: 'teacher' },
    { name: 'Melango Student', email: 'student@melango.com', password: 'Student123!', role: 'student' },
  ]);
  // eslint-disable-next-line no-console
  console.log('[db] Seeded demo logins: admin@melango.com / teacher@melango.com / student@melango.com');
}

async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    const conn = await connectLocalMongo();
    await ensureDemoUsers();
    return conn;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[db] Local Mongo unavailable (${err.message}). Starting in-memory MongoDB.`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    const conn = await connectMemoryMongo();
    await ensureDemoUsers();
    return conn;
  }
}

module.exports = { connectDB };
