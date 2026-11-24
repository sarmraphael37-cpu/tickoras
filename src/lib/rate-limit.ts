/**
 * Small in-process limiter for sensitive form endpoints.
 *
 * Serverless instances do not share memory, so this is a first line of defence,
 * not a distributed rate limiter. Production deployments should also enable
 * Supabase Auth's built-in limits and a platform-level WAF or Upstash limiter.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(bucketKey);
    }
    lastSweep = now;
  }

  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientKey(prefix: string, identifier?: string | null): string {
  return `${prefix}:${identifier?.trim().toLowerCase() || "anonymous"}`;
}
