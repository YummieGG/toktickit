import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  isValidPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  SCRYPT_KEY_BYTES,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
  verifyPassword,
} from '../../src/lib/password';

describe('Lab 3-2 password policy and scrypt storage', () => {
  it('enforces both length boundaries, three classes, and no whitespace/control characters', () => {
    expect(isValidPassword('Aa1!'.padEnd(PASSWORD_MIN_LENGTH, 'x'))).toBe(true);
    expect(isValidPassword('Aa1!')).toBe(false);
    expect(isValidPassword('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
    expect(isValidPassword('onlylowercase12')).toBe(false);
    expect(isValidPassword('Valid Pass#12')).toBe(false);
    expect(isValidPassword('Valid\nPass#12')).toBe(false);
  });

  it('stores an encoded hash with the required scrypt parameters and verifies it safely', async () => {
    const password = 'ValidPass#12';
    const encoded = await hashPassword(password);
    const [algorithm, n, r, p, salt, key] = encoded.split('$');

    expect(algorithm).toBe('scrypt');
    expect(Number(n)).toBe(SCRYPT_N);
    expect(Number(r)).toBe(SCRYPT_R);
    expect(Number(p)).toBe(SCRYPT_P);
    expect(Buffer.from(salt!, 'base64url')).toHaveLength(16);
    expect(Buffer.from(key!, 'base64url')).toHaveLength(SCRYPT_KEY_BYTES);
    expect(await verifyPassword(password, encoded)).toBe(true);
    expect(await verifyPassword('WrongPass#12', encoded)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
  });
});
