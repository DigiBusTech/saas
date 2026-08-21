// ============================================
// SECURITY MIDDLEWARE
// ============================================
// Rate limiting, input validation, CSRF protection, XSS prevention

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: (req: NextRequest) => string;
}

export function rateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const identifier = config.identifier 
      ? config.identifier(req)
      : req.ip || req.headers.get('x-forwarded-for') || 'anonymous';

    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetAt < now) {
      // Create new entry
      entry = {
        count: 1,
        resetAt: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
      return null; // Allow request
    }

    if (entry.count >= config.maxRequests) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          retryAfter: Math.ceil((entry.resetAt - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(entry.resetAt),
          }
        }
      );
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);
    return null; // Allow request
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // API routes: 100 requests per 15 minutes
  api: rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
  }),
  
  // Auth routes: 10 requests per 15 minutes
  auth: rateLimit({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  }),
  
  // Webhooks: 1000 requests per minute (for high-volume platforms)
  webhook: rateLimit({
    maxRequests: 1000,
    windowMs: 60 * 1000,
  }),
  
  // Heavy operations: 5 requests per minute
  heavy: rateLimit({
    maxRequests: 5,
    windowMs: 60 * 1000,
  }),
};

// ============================================
// INPUT VALIDATION
// ============================================

const DANGEROUS_PATTERNS = [
  // SQL Injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/gi,
  // XSS
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=
  /<iframe/gi,
  // Path Traversal
  /\.\.\/|\.\.\\|\.\.\%2f/gi,
  // Command Injection
  /[;&|`$()]/g,
];

export function sanitizeInput(input: string): string {
  if (!input) return input;
  
  let sanitized = input;
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

export function validateInput(input: any, rules: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  type?: 'string' | 'number' | 'email' | 'url' | 'uuid';
}): { valid: boolean; error?: string } {
  // Check required
  if (rules.required && (input === null || input === undefined || input === '')) {
    return { valid: false, error: 'This field is required' };
  }

  if (!input) {
    return { valid: true }; // Not required and empty is ok
  }

  // Check type
  if (rules.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      return { valid: false, error: 'Invalid email format' };
    }
  }

  if (rules.type === 'url') {
    try {
      new URL(input);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  if (rules.type === 'uuid') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(input)) {
      return { valid: false, error: 'Invalid UUID format' };
    }
  }

  if (rules.type === 'number') {
    if (isNaN(Number(input))) {
      return { valid: false, error: 'Must be a number' };
    }
  }

  // Check length for strings
  const inputStr = String(input);
  if (rules.minLength && inputStr.length < rules.minLength) {
    return { valid: false, error: `Must be at least ${rules.minLength} characters` };
  }

  if (rules.maxLength && inputStr.length > rules.maxLength) {
    return { valid: false, error: `Must be at most ${rules.maxLength} characters` };
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(inputStr)) {
    return { valid: false, error: 'Invalid format' };
  }

  return { valid: true };
}

// ============================================
// CORS CONFIGURATION
// ============================================

export function setCorsHeaders(response: NextResponse, allowedOrigins: string[] = []): NextResponse {
  const origin = allowedOrigins.length > 0 
    ? allowedOrigins.join(',') 
    : process.env.NEXT_PUBLIC_APP_URL || '*';

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

// ============================================
// SECURITY HEADERS
// ============================================

export function setSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.telegram.org https://api.whatsapp.com",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  
  // Strict Transport Security (HTTPS only)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
  
  return response;
}

// ============================================
// REQUEST LOGGING
// ============================================

export function logRequest(req: NextRequest, startTime: number) {
  const duration = Date.now() - startTime;
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip,
    userAgent,
    duration: `${duration}ms`,
  }));
}

// ============================================
// ERROR HANDLING
// ============================================

export function handleApiError(error: any): NextResponse {
  console.error('API Error:', error);

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error.code === 'PGRST301') {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }

  if (error.code === '23505') {
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    );
  }

  if (error.code === '23503') {
    return NextResponse.json(
      { error: 'Referenced resource does not exist' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { 
      error: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { stack: error.stack })
    },
    { status: 500 }
  );
}

// ============================================
// IP BLOCKING
// ============================================

const blockedIPs = new Set<string>();

export function blockIP(ip: string) {
  blockedIPs.add(ip);
}

export function unblockIP(ip: string) {
  blockedIPs.delete(ip);
}

export function isIPBlocked(req: NextRequest): boolean {
  const ip = req.ip || req.headers.get('x-forwarded-for');
  if (!ip) return false;
  
  return blockedIPs.has(ip);
}

// ============================================
// HONEYPOT DETECTION
// ============================================

const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();

export function trackSuspiciousActivity(req: NextRequest, reason: string) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  
  const entry = suspiciousIPs.get(ip) || { count: 0, lastSeen: Date.now() };
  entry.count++;
  entry.lastSeen = Date.now();
  suspiciousIPs.set(ip, entry);

  console.warn(`Suspicious activity from ${ip}: ${reason} (count: ${entry.count})`);

  // Auto-block after 10 suspicious activities
  if (entry.count >= 10) {
    blockIP(ip);
    console.error(`IP ${ip} has been blocked due to suspicious activity`);
  }
}
