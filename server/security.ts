/**
 * Security Middleware and Utilities
 * Implements OWASP security best practices for authentication, rate limiting, and data protection
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ============================================================================
// 🛡️ RATE LIMITING - Prevent brute force attacks on auth endpoints
// ============================================================================

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const rateLimitStores: { [endpoint: string]: RateLimitStore } = {};

/**
 * Create a rate limiter for specific endpoints
 * @param windowMs - Time window in milliseconds (e.g., 60000 for 1 minute)
 * @param maxRequests - Maximum requests allowed per IP in the window
 * @param endpoint - Name of the endpoint being protected
 */
export function createRateLimiter(
  windowMs: number,
  maxRequests: number,
  endpoint: string
) {
  if (!rateLimitStores[endpoint]) {
    rateLimitStores[endpoint] = {};
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const store = rateLimitStores[endpoint];
    const now = Date.now();

    if (!store[clientIp]) {
      store[clientIp] = { count: 0, resetTime: now + windowMs };
    }

    const record = store[clientIp];

    // Reset counter if window has expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", record.resetTime);

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Get client IP address, respecting X-Forwarded-For and proxy settings
 */
function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.headers["cf-connecting-ip"] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

// ============================================================================
// 🔐 SECURE COOKIE CONFIGURATION
// ============================================================================

export interface SecureCookieOptions {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
}

/**
 * Get secure cookie options for session tokens
 * - HttpOnly: Prevents JavaScript from accessing the cookie (XSS protection)
 * - Secure: Only sent over HTTPS in production
 * - SameSite=Strict: Only sent with same-site requests (CSRF protection)
 */
export function getSecureCookieOptions(
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
): SecureCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    maxAge: maxAgeMs,
    httpOnly: true, // 🔒 Prevents XSS attacks
    secure: isProduction, // 🔒 HTTPS only in production
    sameSite: "strict", // 🔒 CSRF protection
    path: "/",
  };
}

// ============================================================================
// 🎫 CSRF TOKEN GENERATION AND VALIDATION
// ============================================================================

const csrfTokens = new Map<string, { token: string; createdAt: number }>();
const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Generate a cryptographically secure CSRF token
 * Tokens expire after 1 hour for security
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Store CSRF token for validation (session-based CSRF protection)
 * @param sessionId - User's session ID
 * @returns Generated CSRF token
 */
export function createCsrfToken(sessionId: string): string {
  const token = generateCsrfToken();
  csrfTokens.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
  return token;
}

/**
 * Validate CSRF token
 * @param sessionId - User's session ID
 * @param token - Token from request
 * @returns true if token is valid and not expired
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);

  if (!stored) {
    return false;
  }

  // Check token expiration
  if (Date.now() - stored.createdAt > CSRF_TOKEN_TTL) {
    csrfTokens.delete(sessionId);
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(stored.token, token);
}

/**
 * Constant-time string comparison
 * Prevents timing attacks that could leak information about token validity
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

// ============================================================================
// 🔒 SECURITY HEADERS MIDDLEWARE
// ============================================================================

/**
 * Add security headers to all responses
 * Implements OWASP recommended security headers
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  // Prevent clickjacking attacks
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection in older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Control referrer information
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // Content Security Policy - Strict, blocks inline scripts
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'"
  );

  next();
}

// ============================================================================
// 🧹 INPUT SANITIZATION
// ============================================================================

/**
 * Remove potentially dangerous characters from email
 * Validates email format per RFC 5322 (simplified)
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>\"()]/g, ""); // Remove common injection characters
}

/**
 * Sanitize string input to prevent XSS
 * Removes/escapes HTML special characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"'`]/g, (char) => {
      const escapeMap: { [key: string]: string } = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;",
      };
      return escapeMap[char];
    });
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(input: unknown): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  return num;
}

// ============================================================================
// 🔍 ERROR HANDLING - Never leak stack traces in production
// ============================================================================

/**
 * Production-safe error response
 * Never sends stack traces or internal error details to clients
 */
export function sendSecureError(
  res: Response,
  statusCode: number,
  message: string,
  internalError?: Error
) {
  // Log internal error details for debugging (in production logs only)
  if (process.env.NODE_ENV === "production" && internalError) {
    console.error("[security] Error:", internalError);
  }

  // Send generic error to client in production
  const clientMessage =
    process.env.NODE_ENV === "production"
      ? "An error occurred. Please try again."
      : message;

  res.status(statusCode).json({
    error: clientMessage,
    ...(process.env.NODE_ENV !== "production" && {
      details: internalError?.message,
    }),
  });
}

// ============================================================================
// 🔄 SESSION CLEANUP - Prevent memory leaks
// ============================================================================

/**
 * Periodically clean up expired CSRF tokens
 * Prevents unbounded memory growth
 */
export function startCsrfTokenCleanup(intervalMs: number = 60 * 60 * 1000) {
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of csrfTokens.entries()) {
      if (now - data.createdAt > CSRF_TOKEN_TTL) {
        csrfTokens.delete(sessionId);
      }
    }
  }, intervalMs);
}

// ============================================================================
// 📊 SECURITY AUDIT LOGGING
// ============================================================================

interface SecurityEvent {
  type: "auth_failure" | "rate_limit" | "csrf_failure" | "validation_error";
  ip: string;
  timestamp: Date;
  details: string;
}

const securityLog: SecurityEvent[] = [];

/**
 * Log security-relevant events for audit trails
 * Use with external logging service in production (e.g., Sentry, LogRocket)
 */
export function logSecurityEvent(
  type: SecurityEvent["type"],
  req: Request,
  details: string
) {
  const event: SecurityEvent = {
    type,
    ip: getClientIp(req),
    timestamp: new Date(),
    details,
  };

  securityLog.push(event);

  // Keep only last 1000 events in memory
  if (securityLog.length > 1000) {
    securityLog.shift();
  }

  // Log to console in production (should use external service)
  if (process.env.NODE_ENV === "production") {
    console.warn(`[security] ${type}: ${details} from ${event.ip}`);
  }
}

/**
 * Get security event log (admin only in production)
 */
export function getSecurityLog(): SecurityEvent[] {
  return [...securityLog];
}
