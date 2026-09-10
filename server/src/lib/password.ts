import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';
import { promisify } from 'node:util';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const SCRYPT_N = 32_768;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
export const SCRYPT_SALT_BYTES = 16;
export const SCRYPT_KEY_BYTES = 32;

const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
) => Promise<Buffer>;

export interface PasswordValidationError {
  code: 'INVALID_PASSWORD';
  message: string;
}

export function validatePassword(value: unknown): PasswordValidationError | null {
  if (typeof value !== 'string') {
    return { code: 'INVALID_PASSWORD', message: 'Password is required' };
  }

  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return {
      code: 'INVALID_PASSWORD',
      message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    };
  }

  if (/\s|\p{Cc}/u.test(value)) {
    return {
      code: 'INVALID_PASSWORD',
      message: 'Password must not contain whitespace or control characters',
    };
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter((pattern) => pattern.test(value)).length;
  if (classes < 3) {
    return {
      code: 'INVALID_PASSWORD',
      message: 'Password must contain at least three of lowercase, uppercase, digit, and special characters',
    };
  }

  return null;
}

export function isValidPassword(value: unknown): value is string {
  return validatePassword(value) === null;
}

function encodeHash(salt: Buffer, derivedKey: Buffer): string {
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

function decodeHash(encoded: string): { salt: Buffer; derivedKey: Buffer; options: ScryptOptions } | null {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return null;

  const saltPart = parts[4];
  const keyPart = parts[5];
  if (!saltPart || !keyPart) return null;

  try {
    const salt = Buffer.from(saltPart, 'base64url');
    const derivedKey = Buffer.from(keyPart, 'base64url');
    if (salt.length !== SCRYPT_SALT_BYTES || derivedKey.length !== SCRYPT_KEY_BYTES) return null;
    return {
      salt,
      derivedKey,
      options: { N: n, r, p, maxmem: SCRYPT_MAX_MEMORY },
    };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const validationError = validatePassword(password);
  if (validationError) throw new Error(validationError.message);

  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derivedKey = await scryptAsync(password, salt, SCRYPT_KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  return encodeHash(salt, derivedKey);
}

export async function verifyPassword(password: string, encodedHash: string | null): Promise<boolean> {
  if (typeof password !== 'string' || !encodedHash) return false;
  const decoded = decodeHash(encodedHash);
  if (!decoded) return false;

  try {
    const candidate = await scryptAsync(
      password,
      decoded.salt,
      decoded.derivedKey.length,
      decoded.options,
    );
    return candidate.length === decoded.derivedKey.length
      && timingSafeEqual(candidate, decoded.derivedKey);
  } catch {
    return false;
  }
}
