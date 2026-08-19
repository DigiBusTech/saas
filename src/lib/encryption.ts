import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is not set');
  // Preserve raw 32-byte hex keys; derive a stable AES-256 key for normal secrets.
  if (/^[0-9a-fA-F]{64}$/.test(key)) return Buffer.from(key, 'hex');
  return createHash('sha256').update(key, 'utf8').digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a hex-encoded string: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv (32 hex) + tag (32 hex) + ciphertext
  return iv.toString('hex') + tag.toString('hex') + encrypted;
}

/**
 * Decrypt a hex-encoded AES-256-GCM encrypted string.
 */
export function decrypt(encryptedHex: string): string {
  const key = getKey();

  const iv = Buffer.from(encryptedHex.slice(0, IV_LENGTH * 2), 'hex');
  const tag = Buffer.from(encryptedHex.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
  const ciphertext = encryptedHex.slice((IV_LENGTH + TAG_LENGTH) * 2);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask a sensitive string for display (show last 4 chars).
 */
export function maskSecret(value: string): string {
  if (value.length <= 4) return '••••';
  return '••••••••' + value.slice(-4);
}
