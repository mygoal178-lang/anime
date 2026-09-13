import { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Lightweight in-memory rate limiter for serverless / single-node deploys.
 * Limits are per-instance (reset on cold start), which is still enough to
 * blunt burst abuse against public API routes.
 */
const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map does not grow without bound on long-lived Node.
const CLEAN_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEAN_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * @param maxRequests Maximum requests allowed in the window
 * @param windowMs Window size in milliseconds (default 60s)
 */
export function rateLimit(maxRequests: number, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanup(now);

    const key = `${clientKey(req)}:${req.method}:${req.path}`;
    let bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, maxRequests - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
      });
    }

    next();
  };
}
