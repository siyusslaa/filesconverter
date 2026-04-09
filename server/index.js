require('dotenv').config();

const express = require('express');
const path = require('path');
const config = require('./config');
const convertRoutes = require('../routes/convertRoutes');
const downloadRoutes = require('../routes/downloadRoutes');
const healthRoutes = require('../routes/healthRoutes');
const { helmetMiddleware, baseRateLimiter } = require('../middleware/security');
const { requestLogger } = require('../utils/logger');
const { ensureTmpDirs, startCleanupScheduler } = require('../utils/fileCleanup');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const { handleMulterErrors } = require('../middleware/validation');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(helmetMiddleware);
app.use(baseRateLimiter);
app.use(requestLogger);
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(express.static(config.paths.publicDir, {
  etag: true,
  dotfiles: 'deny',
  maxAge: config.isProd ? '1d' : 0,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.get('/', (_req, res) => {
  res.sendFile(path.join(config.paths.publicDir, 'index.html'));
});

app.use('/api/health', healthRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/download', downloadRoutes);

app.use(handleMulterErrors);
app.use(notFoundHandler);
app.use(errorHandler);

const boot = async () => {
  await ensureTmpDirs();
  startCleanupScheduler();

  app.listen(config.port, () => {
    process.stdout.write(`SecureConvert listening on port ${config.port}\n`);
  });
};

boot().catch((error) => {
  process.stderr.write(`Startup failed: ${error.message}\n`);
  process.exit(1);
});
