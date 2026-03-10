import type { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

function clientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, keyPrefix = "rl" } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${clientIp(req)}`;
    const current = store.get(key);

    if (!current || now > current.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(retryAfter, 1)));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    current.count += 1;
    store.set(key, current);
    return next();
  };
}

export function setSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Permissions-Policy", "camera=(self)");

  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
}
