const config = require('../server/config');

const allowedHeaders = ['user-agent', 'content-type'];

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();
  const safeHeaders = {};

  for (const key of allowedHeaders) {
    if (req.headers[key]) {
      safeHeaders[key] = req.headers[key];
    }
  }

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const line = {
      level: 'info',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ip: req.ip,
      headers: safeHeaders
    };

    process.stdout.write(`${JSON.stringify(line)}\n`);
  });

  next();
};

const logError = (error, context = {}) => {
  const payload = {
    level: 'error',
    message: error.message,
    name: error.name,
    ...context
  };

  if (!config.isProd && error.stack) {
    payload.stack = error.stack;
  }

  process.stderr.write(`${JSON.stringify(payload)}\n`);
};

module.exports = {
  requestLogger,
  logError
};
