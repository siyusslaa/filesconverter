const express = require('express');
const path = require('path');
const { buildUpload } = require('../middleware/upload');
const { validateFilesForCategory } = require('../middleware/validation');
const { uploadRateLimiter } = require('../middleware/security');
const {
  convertPdfToImageSet,
  convertImagesToPdf,
  compressPdf,
  createZip
} = require('../services/conversionService');
const { safeUnlink } = require('../utils/fileCleanup');
const { putDownload } = require('../utils/downloadStore');

const router = express.Router();

const buildResult = (files, preferredZipName) => {
  const items = files.map((filePath, index) => {
    const token = putDownload({
      filePath,
      downloadName: `${String(index + 1).padStart(3, '0')}-${path.basename(filePath)}`
    });

    return {
      label: path.basename(filePath),
      url: `/api/download/${token}`
    };
  });

  if (files.length > 1) {
    return createZip(files, preferredZipName).then((zipPath) => {
      const zipToken = putDownload({
        filePath: zipPath,
        downloadName: preferredZipName
      });

      return {
        files: items,
        zipUrl: `/api/download/${zipToken}`
      };
    });
  }

  return Promise.resolve({ files: items, zipUrl: null });
};

router.post(
  '/pdf-to-png',
  uploadRateLimiter,
  buildUpload('pdf', false),
  validateFilesForCategory('pdf'),
  async (req, res, next) => {
    const [file] = req.files || [req.file];

    try {
      const result = await convertPdfToImageSet(file.path, 'png');
      const payload = await buildResult(result.files, 'pdf-to-png.zip');
      res.json({ message: 'PDF converted to PNG', ...payload });
    } catch (error) {
      next(error);
    } finally {
      await safeUnlink(file?.path);
    }
  }
);

router.post(
  '/pdf-to-jpeg',
  uploadRateLimiter,
  buildUpload('pdf', false),
  validateFilesForCategory('pdf'),
  async (req, res, next) => {
    const [file] = req.files || [req.file];

    try {
      const result = await convertPdfToImageSet(file.path, 'jpeg');
      const payload = await buildResult(result.files, 'pdf-to-jpeg.zip');
      res.json({ message: 'PDF converted to JPEG', ...payload });
    } catch (error) {
      next(error);
    } finally {
      await safeUnlink(file?.path);
    }
  }
);

router.post(
  '/image-to-pdf',
  uploadRateLimiter,
  buildUpload('image', true),
  validateFilesForCategory('image'),
  async (req, res, next) => {
    const files = req.files || [];

    try {
      const result = await convertImagesToPdf(files.map((f) => f.path));
      const payload = await buildResult(result.files, 'images-to-pdf.zip');
      res.json({ message: 'Images converted to PDF', ...payload });
    } catch (error) {
      next(error);
    } finally {
      await Promise.all(files.map((file) => safeUnlink(file.path)));
    }
  }
);

router.post(
  '/compress-pdf',
  uploadRateLimiter,
  buildUpload('pdf', false),
  validateFilesForCategory('pdf'),
  async (req, res, next) => {
    const [file] = req.files || [req.file];

    try {
      const result = await compressPdf(file.path);
      const payload = await buildResult(result.files, 'compressed-pdf.zip');
      res.json({ message: 'PDF compressed', ...payload });
    } catch (error) {
      next(error);
    } finally {
      await safeUnlink(file?.path);
    }
  }
);

module.exports = router;
