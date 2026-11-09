const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Configure Helmet with secure CSP and resource policy compatible with React
const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Allow client development hot-reloads and embedded assets
});

// General API Rate Limiter: 300 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Stricter Rate Limiter for Authentication: 30 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
});

// Rate Limiter for AI Chat Assistant: 25 requests per minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI Assistant requests. Please slow down and wait a minute.',
  },
});

module.exports = {
  securityHeaders,
  apiLimiter,
  authLimiter,
  chatLimiter,
};
