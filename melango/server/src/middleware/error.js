const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = details.map((d) => d.message).join(', ') || 'Validation failed';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = field ? `Duplicate value for ${field}` : 'Duplicate resource';
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than the 25MB limit' : err.message;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  if (env.nodeEnv === 'development' && statusCode >= 500) body.stack = err.stack;

  return res.status(statusCode).json(body);
}
/* eslint-enable no-unused-vars */

module.exports = { notFound, errorHandler };
