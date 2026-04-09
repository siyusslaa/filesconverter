const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const allowed = {
  pdf: {
    exts: new Set(['.pdf']),
    mimes: new Set(['application/pdf'])
  },
  image: {
    exts: new Set(['.jpg', '.jpeg', '.png']),
    mimes: new Set(['image/jpeg', 'image/png'])
  }
};

const signatureMatchers = {
  pdf: (buffer) => buffer.length > 4 && buffer.subarray(0, 5).toString() === '%PDF-',
  jpeg: (buffer) => buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8,
  png: (buffer) =>
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
};

const safeRandomName = (suffix = '') => `${crypto.randomUUID()}${suffix}`;

const getExtension = (name) => path.extname((name || '').toLowerCase());

const ensureInDirectory = (targetPath, expectedRoot) => {
  const resolved = path.resolve(targetPath);
  const root = path.resolve(expectedRoot);

  if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) {
    const error = new Error('Unsafe path rejected');
    error.status = 400;
    throw error;
  }

  return resolved;
};

const readFileHead = async (filePath, bytes = 4100) => {
  const handle = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const validateUploadedFile = async ({ filePath, expectedCategory, extension, mimetype }) => {
  const head = await readFileHead(filePath);

  if (head.length === 0) {
    const err = new Error('Empty file rejected');
    err.status = 400;
    throw err;
  }

  const ext = getExtension(extension);

  if (expectedCategory === 'pdf') {
    const extAllowed = allowed.pdf.exts.has(ext);
    const mimeAllowed = allowed.pdf.mimes.has((mimetype || '').toLowerCase());
    const signatureAllowed = signatureMatchers.pdf(head);

    if (!extAllowed || !mimeAllowed || !signatureAllowed) {
      const err = new Error('Invalid PDF upload');
      err.status = 400;
      throw err;
    }

    return { detectedType: 'application/pdf' };
  }

  if (expectedCategory === 'image') {
    const extAllowed = allowed.image.exts.has(ext);
    const mimeAllowed = allowed.image.mimes.has((mimetype || '').toLowerCase());
    const isJpeg = signatureMatchers.jpeg(head);
    const isPng = signatureMatchers.png(head);

    const signatureAllowed = (ext === '.png' && isPng) || ((ext === '.jpg' || ext === '.jpeg') && isJpeg);

    if (!extAllowed || !mimeAllowed || !signatureAllowed) {
      const err = new Error('Invalid image upload');
      err.status = 400;
      throw err;
    }

    return { detectedType: isPng ? 'image/png' : 'image/jpeg' };
  }

  const err = new Error('Unsupported validation category');
  err.status = 500;
  throw err;
};

module.exports = {
  allowed,
  safeRandomName,
  getExtension,
  ensureInDirectory,
  validateUploadedFile
};
