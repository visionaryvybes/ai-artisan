import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimit {
  private requests: Map<string, RequestRecord>;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.requests = new Map();
    this.config = {
      keyPrefix: 'rate-limit:',
      ...config
    };
  }

  private getKey(identifier: string): string {
    return `${this.config.keyPrefix}${identifier}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  async check(req: NextRequest, identifier?: string): Promise<boolean> {
    this.cleanup();

    const key = this.getKey(identifier || this.getRequestIdentifier(req));
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    if (now >= record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.config.windowMs;
      return true;
    }

    record.count++;
    return record.count <= this.config.maxRequests;
  }

  private getRequestIdentifier(req: NextRequest): string {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    return forwardedFor || realIp || 'unknown';
  }

  getRemainingRequests(req: NextRequest): number {
    const key = this.getKey(this.getRequestIdentifier(req));
    const record = this.requests.get(key);

    if (!record || Date.now() >= record.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - record.count);
  }

  getResetTime(req: NextRequest): number {
    const key = this.getKey(this.getRequestIdentifier(req));
    const record = this.requests.get(key);

    if (!record || Date.now() >= record.resetTime) {
      return Date.now() + this.config.windowMs;
    }

    return record.resetTime;
  }
}

// Create a default rate limiter instance
export const defaultRateLimiter = new RateLimit({
  maxRequests: 100,  // 100 requests
  windowMs: 60000,   // per minute
  keyPrefix: 'api-rate-limit:'
}); 