import express from 'express';
import { describe, expect, it } from 'vitest';
import { configureTrustProxy } from '../../src/index';

describe('Server trusted proxy configuration', () => {
  it('does not configure trust proxy in non-production when TRUST_PROXY is unset', () => {
    const app = express();
    configureTrustProxy(app, { NODE_ENV: 'development' });
    expect(app.get('trust proxy')).toBe(false);
  });

  it('defaults to 1 hop in production when TRUST_PROXY is unset', () => {
    const app = express();
    configureTrustProxy(app, { NODE_ENV: 'production' });
    expect(app.get('trust proxy')).toBe(1);
  });

  it('uses numeric TRUST_PROXY when provided in production', () => {
    const app = express();
    configureTrustProxy(app, { NODE_ENV: 'production', TRUST_PROXY: '2' });
    expect(app.get('trust proxy')).toBe(2);
  });

  it('uses string TRUST_PROXY (e.g. loopback or subnet) when provided in production', () => {
    const app = express();
    configureTrustProxy(app, { NODE_ENV: 'production', TRUST_PROXY: 'loopback' });
    expect(app.get('trust proxy')).toBe('loopback');
  });

  it('honors explicit TRUST_PROXY in non-production environments', () => {
    const app = express();
    configureTrustProxy(app, { NODE_ENV: 'test', TRUST_PROXY: '1' });
    expect(app.get('trust proxy')).toBe(1);
  });
});
