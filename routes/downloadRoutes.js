const express = require('express');
const path = require('path');
const { getDownload } = require('../utils/downloadStore');
const { safeUnlink } = require('../utils/fileCleanup');

const router = express.Router();

router.get('/:token', async (req, res, next) => {
  const item = getDownload(req.params.token);

  if (!item) {
    return res.status(404).json({ error: 'Download unavailable or expired' });
  }

  const fileName = item.downloadName || path.basename(item.filePath);

  return res.download(item.filePath, fileName, async (error) => {
    if (error) {
      return next(error);
    }

    await safeUnlink(item.filePath);
    return undefined;
  });
});

module.exports = router;
