const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../server/config');

const baseRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMinutes * 60 * 1000,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' }
});

const uploadRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMinutes * 60 * 1000,
  max: config.uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit reached. Try again later.' }
});

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

module.exports = {
  helmetMiddleware,
  baseRateLimiter,
  uploadRateLimiter
};
