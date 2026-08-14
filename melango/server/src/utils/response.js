function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function created(res, data) {
  return ok(res, data, 201);
}

function message(res, msg, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message: msg });
}

module.exports = { ok, created, message };
