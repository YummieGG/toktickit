process.env.NODE_ENV = 'test';
process.env.APP_ORIGIN ??= 'http://localhost:5173';
// This value exists only in the test process and is never used by deployments.
process.env.AUTH_IP_PEPPER = 'test-only-auth-ip-pepper-not-for-deployment';
