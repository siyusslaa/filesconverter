const crypto = require('crypto');
const config = require('../server/config');

const ttlMs = config.tempFileTtlMinutes * 60 * 1000;
const store = new Map();

const putDownload = (entry) => {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + ttlMs;
  store.set(token, { ...entry, expiresAt });
  return token;
};

const getDownload = (token) => {
  const item = store.get(token);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  return item;
};

const cleanupStore = () => {
  const now = Date.now();
  for (const [token, item] of store.entries()) {
    if (item.expiresAt < now) {
      store.delete(token);
    }
  }
};

setInterval(cleanupStore, Math.max(60_000, ttlMs / 3));

module.exports = {
  putDownload,
  getDownload
};
