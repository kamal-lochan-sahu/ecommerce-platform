/**
 * Simple structured logger — wraps console with level prefix and env guard.
 * In production, sensitive values (OTP, tokens) must never be logged.
 * Replace with Winston/Pino for production log aggregation.
 */
const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  info:  (...args) => console.log('[INFO]',  ...args),
  warn:  (...args) => console.warn('[WARN]',  ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  // dev-only: never call in production paths
  debug: (...args) => { if (isDev) console.log('[DEBUG]', ...args); },
};

export default logger;
