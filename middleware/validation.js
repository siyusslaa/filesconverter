const multer = require('multer');
const { validateUploadedFile } = require('../utils/fileSafety');

const validateFilesForCategory = (category) => async (req, _res, next) => {
  const files = req.files || (req.file ? [req.file] : []);

  if (!Array.isArray(files) || files.length === 0) {
    const error = new Error('At least one valid file is required');
    error.status = 400;
    return next(error);
  }

  try {
    await Promise.all(
      files.map((file) =>
        validateUploadedFile({
          filePath: file.path,
          expectedCategory: category,
          extension: file.originalname,
          mimetype: file.mimetype
        })
      )
    );
    return next();
  } catch (error) {
    return next(error);
  }
};

const handleMulterErrors = (error, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    error.status = 400;
    if (error.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File exceeds max size limit';
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      error.message = 'Too many files uploaded';
    }
    return next(error);
  }

  return next(error);
};

module.exports = {
  validateFilesForCategory,
  handleMulterErrors
};
