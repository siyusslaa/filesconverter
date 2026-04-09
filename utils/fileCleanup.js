const fs = require('fs/promises');
const path = require('path');
const config = require('../server/config');
const { logError } = require('./logger');

const ensureTmpDirs = async () => {
  await fs.mkdir(config.paths.tmpDir, { recursive: true, mode: 0o700 });
  await fs.mkdir(config.paths.uploadsDir, { recursive: true, mode: 0o700 });
  await fs.mkdir(config.paths.outputsDir, { recursive: true, mode: 0o700 });
};

const safeUnlink = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError(error, { action: 'safeUnlink' });
    }
  }
};

const safeRm = async (targetPath) => {
  if (!targetPath) return;

  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError(error, { action: 'safeRm' });
    }
  }
};

const cleanupExpiredInDirectory = async (directory, olderThanMs) => {
  let entries = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError(error, { action: 'cleanupReadDir', directory });
    }
    return;
  }

  const now = Date.now();

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      try {
        const stat = await fs.stat(fullPath);
        if (now - stat.mtimeMs < olderThanMs) return;

        await safeRm(fullPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logError(error, { action: 'cleanupEntry', fullPath });
        }
      }
    })
  );
};

const startCleanupScheduler = () => {
  const intervalMs = config.cleanupIntervalMinutes * 60 * 1000;
  const expiryMs = config.tempFileTtlMinutes * 60 * 1000;

  const runCleanup = async () => {
    await cleanupExpiredInDirectory(config.paths.uploadsDir, expiryMs);
    await cleanupExpiredInDirectory(config.paths.outputsDir, expiryMs);
  };

  runCleanup().catch((error) => logError(error, { action: 'cleanupInitialRun' }));
  return setInterval(() => {
    runCleanup().catch((error) => logError(error, { action: 'cleanupIntervalRun' }));
  }, intervalMs);
};

module.exports = {
  ensureTmpDirs,
  safeUnlink,
  safeRm,
  startCleanupScheduler
};
