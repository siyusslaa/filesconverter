const config = require('../server/config');
const { logError } = require('../utils/logger');

const notFoundHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

const errorHandler = (error, _req, res, _next) => {
  const status = Number.isInteger(error.status) ? error.status : 500;
  const isServerError = status >= 500;

  if (isServerError) {
    logError(error);
  }

  const payload = {
    error: status >= 500 && config.isProd ? 'Conversion request failed' : error.message || 'Request failed'
  };

  if (!config.isProd && error.code) {
    payload.code = error.code;
  }

  res.status(status).json(payload);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
