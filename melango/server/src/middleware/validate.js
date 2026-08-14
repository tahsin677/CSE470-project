const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(
    ApiError.badRequest(errors.map((e) => e.message).join(', '), errors)
  );
}

// Guards against CastErrors on user-supplied ids before hitting the database.
function validateObjectId(...paramNames) {
  const names = paramNames.length ? paramNames : ['id'];
  return (req, res, next) => {
    for (const name of names) {
      const value = req.params[name];
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return next(ApiError.badRequest(`Invalid ${name}`));
      }
    }
    return next();
  };
}

module.exports = { validate, validateObjectId };
