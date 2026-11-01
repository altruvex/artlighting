import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { upstashRest } from "../../upstash-rest.cjs";

/**
 * Rate Limiting Configuration
 * Protects API endpoints from abuse and DDoS attacks
 */

// REDIS_URL or the UPSTASH_REDIS_REST_* pair (see upstash-rest.cjs).
const rest = upstashRest();
const redis = new Redis({ url: rest?.url ?? "", token: rest?.token ?? "" });

/**
 * Different rate limits for different endpoint types
 */
export const rateLimiters = {
  // Strict limit for authentication endpoints (10 requests per minute)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:auth",
  }),

  // Standard limit for API endpoints (100 requests per minute)
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "ratelimit:api",
  }),

  // Stricter limit for write operations (30 requests per minute)
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:write",
  }),

  // Very strict limit for order creation (5 requests per minute)
  order: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "ratelimit:order",
  }),

  // Lenient limit for read operations (200 requests per minute)
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, "1 m"),
    analytics: true,
    prefix: "ratelimit:read",
  }),

  // Search endpoints (50 requests per minute)
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    analytics: true,
    prefix: "ratelimit:search",
  }),
};

/**
 * Apply rate limiting to a request
 * Returns null if allowed, NextResponse with 429 if rate limit exceeded
 */
export async function applyRateLimit(
  request: NextRequest,
  limiterType: keyof typeof rateLimiters = "api"
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const limiter = rateLimiters[limiterType];

  try {
    const { success, limit, reset, remaining } = await limiter.limit(ip);

    const headers = {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": new Date(reset).toISOString(),
    };

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "You have exceeded the rate limit. Please try again later.",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers,
        }
      );
    }

    return null;
  } catch (error) {
    // If rate limiting fails (e.g., Redis is down), allow the request but log error
    console.error("Rate limiting error:", error);
    return null;
  }
}

/**
 * Middleware wrapper for rate limiting
 * Use this in your API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  limiterType: keyof typeof rateLimiters = "api"
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = await applyRateLimit(request, limiterType);
    
    if (rateLimitResult) {
      return rateLimitResult;
    }

    return handler(request);
  };
}

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return (request as any).ip || "127.0.0.1";
}

/**
 * Check rate limit without applying it
 * Useful for displaying rate limit info to users
 */
export async function checkRateLimit(
  identifier: string,
  limiterType: keyof typeof rateLimiters = "api"
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const limiter = rateLimiters[limiterType];
  
  try {
    const { success, limit, reset, remaining } = await limiter.limit(identifier);
    
    return {
      allowed: success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }
}
