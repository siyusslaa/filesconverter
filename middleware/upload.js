const path = require('path');
const multer = require('multer');
const config = require('../server/config');
const { allowed, safeRandomName, getExtension } = require('../utils/fileSafety');

const uploadsDir = config.paths.uploadsDir;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = getExtension(file.originalname);
    cb(null, safeRandomName(ext));
  }
});

const isAllowedByCategory = (file, category) => {
  const ext = getExtension(file.originalname);
  const mime = (file.mimetype || '').toLowerCase();
  const rule = allowed[category];

  if (!rule) return false;
  return rule.exts.has(ext) && rule.mimes.has(mime);
};

const buildUpload = (category, multiple = false) =>
  multer({
    storage,
    limits: {
      fileSize: config.maxFileSizeBytes,
      files: config.maxFilesPerRequest
    },
    fileFilter: (_req, file, cb) => {
      if (!isAllowedByCategory(file, category)) {
        const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files');
        error.message = 'Unsupported file type';
        return cb(error);
      }
      return cb(null, true);
    }
  })[multiple ? 'array' : 'single']('files', config.maxFilesPerRequest);

module.exports = {
  buildUpload
};
