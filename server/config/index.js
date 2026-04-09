const path = require('path');

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const baseDir = path.resolve(__dirname, '..', '..');
const tmpDir = path.join(baseDir, 'tmp');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: toInt(process.env.PORT, 3000),
  trustProxy: process.env.TRUST_PROXY || '1',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 25) * 1024 * 1024,
  maxFilesPerRequest: toInt(process.env.MAX_FILES_PER_REQUEST, 10),
  tempFileTtlMinutes: toInt(process.env.TEMP_FILE_TTL_MINUTES, 15),
  cleanupIntervalMinutes: toInt(process.env.CLEANUP_INTERVAL_MINUTES, 5),
  rateLimitWindowMinutes: toInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
  rateLimitMaxRequests: toInt(process.env.RATE_LIMIT_MAX_REQUESTS, 60),
  uploadRateLimitMax: toInt(process.env.UPLOAD_RATE_LIMIT_MAX, 20),
  pdfRenderDpi: toInt(process.env.PDF_RENDER_DPI, 150),
  pdfJpegQuality: toInt(process.env.PDF_JPEG_QUALITY, 85),
  pdfCompressionPreset: process.env.PDF_COMPRESSION_PRESET || 'screen',
  paths: {
    baseDir,
    publicDir: path.join(baseDir, 'public'),
    tmpDir,
    uploadsDir: path.join(tmpDir, 'uploads'),
    outputsDir: path.join(tmpDir, 'outputs')
  }
};
