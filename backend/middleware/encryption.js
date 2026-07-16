const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended IV length for GCM

// ENCRYPTION_KEY must be a 32-byte key, provided as a 64-char hex string in .env
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be set in .env as a 64-character hex string (32 bytes).'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts plaintext clinical notes.
 * @param {string} plaintext
 * @returns {string} combined "iv:authTag:ciphertext" hex string, safe to store in a TEXT column
 */
function encryptField(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypts a value produced by encryptField. Only ever call this for the
 * authenticated owner of the record (or staff explicitly authorized by role
 * middleware) - never return decrypted notes to an unauthenticated caller.
 * @param {string} payload - "iv:authTag:ciphertext" hex string
 * @returns {string} plaintext
 */
function decryptField(payload) {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = String(payload).split(':');
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error('Malformed encrypted payload');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encryptField, decryptField };
