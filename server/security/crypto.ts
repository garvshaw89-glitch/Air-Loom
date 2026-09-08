import crypto from 'crypto';
import path from 'path';

const SECRET_KEY = process.env.SESSION_SECRET || 'air-loom-default-secret-salt-2026';

/**
 * Generate a cryptographically secure URL-safe random token
 */
export function generateSecureToken(bytes = 18): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate a unique ID (UUID v4)
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Hash a password using scrypt with a unique salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Verify a plain text password against a stored hash and salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    if (keyBuffer.length !== hashBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Create an HMAC signature for unlocking a password-protected share session
 */
export function createUnlockToken(shareId: string): string {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(`${shareId}:unlocked`);
  return hmac.digest('hex');
}

/**
 * Verify an unlock token for a share
 */
export function verifyUnlockToken(shareId: string, token: string): boolean {
  const expected = createUnlockToken(shareId);
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(token, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Sanitize a client-supplied filename to prevent path traversal and shell injection
 */
export function sanitizeFilename(input: string): string {
  // Strip null bytes and directory separators
  let name = path.basename(input.replace(/[\0\r\n]/g, ''));
  // Remove dangerous characters
  name = name.replace(/[<>:"/\\|?*]/g, '_');
  // Trim leading/trailing dots and spaces
  name = name.replace(/^[.\s]+|[.\s]+$/g, '');
  if (!name || name === '.' || name === '..') {
    name = `file_${Date.now()}`;
  }
  return name.slice(0, 255); // Max 255 chars
}
