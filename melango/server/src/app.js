const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const env = require('./config/env');
const routes = require('./routes');
const paymentController = require('./controllers/paymentController');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

const allowedOrigins = [
  env.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, Postman, server-to-server) are allowed.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);

if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Stripe signature verification needs the untouched request body, so this route is
// registered with a raw parser before the JSON parser takes over.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(env.uploadDir));

app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'melango-api',
      database: states[mongoose.connection.readyState] || 'unknown',
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    data: { message: 'Melango API', docs: '/api/health' },
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
