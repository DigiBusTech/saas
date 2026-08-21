# 🛡️ SECURITY MIDDLEWARE - QUICK REFERENCE

## Overview
The security middleware (`src/lib/security/middleware.ts`) provides enterprise-grade protection against common attacks and abuse.

---

## 🚦 RATE LIMITING

### Pre-configured Rate Limiters

```typescript
import { rateLimiters } from '@/lib/security/middleware';

// API routes: 100 requests / 15 minutes
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimiters.api(request);
  if (rateLimitResult) {
    return rateLimitResult; // Returns 429 Too Many Requests
  }
  
  // Your logic here
}

// Auth routes: 10 requests / 15 minutes
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimiters.auth(request);
  if (rateLimitResult) return rateLimitResult;
  // ...
}

// Webhooks: 1000 requests / minute
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimiters.webhook(request);
  if (rateLimitResult) return rateLimitResult;
  // ...
}

// Heavy operations: 5 requests / minute
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimiters.heavy(request);
  if (rateLimitResult) return rateLimitResult;
  // ...
}
```

### Custom Rate Limiter

```typescript
import { RateLimiter } from '@/lib/security/middleware';

const customLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
});

export async function POST(request: NextRequest) {
  const rateLimitResult = await customLimiter.check(request);
  if (rateLimitResult) return rateLimitResult;
  // ...
}
```

---

## 🔒 INPUT VALIDATION

### Sanitize User Input (XSS Prevention)

```typescript
import { sanitizeInput } from '@/lib/security/middleware';

// Sanitize single input
const cleanName = sanitizeInput(userInput.name);

// Sanitize all form data
const formData = {
  name: sanitizeInput(data.name),
  email: sanitizeInput(data.email),
  message: sanitizeInput(data.message),
};
```

**What it does:**
- Encodes HTML entities (`<` → `&lt;`, `>` → `&gt;`)
- Prevents XSS attacks via script injection
- Safe for database storage

### Validate Input Schema

```typescript
import { validateInput } from '@/lib/security/middleware';

const validationErrors = validateInput(data, {
  email: { 
    required: true, 
    type: 'email',
  },
  name: { 
    required: true, 
    minLength: 2, 
    maxLength: 100,
  },
  age: { 
    type: 'number',
    min: 18,
    max: 120,
  },
  website: { 
    type: 'url',
  },
  userId: { 
    type: 'uuid',
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, // At least 1 lowercase, 1 uppercase, 1 digit
  },
});

if (validationErrors.length > 0) {
  return NextResponse.json({
    error: 'Validation failed',
    errors: validationErrors,
  }, { status: 400 });
}
```

**Validation Rules:**
- `required`: Field must be present
- `minLength`, `maxLength`: String length constraints
- `min`, `max`: Number range constraints
- `pattern`: Regex pattern matching
- `type`: 'email', 'url', 'uuid', 'number'

### SQL Injection Prevention

The middleware detects and blocks dangerous SQL patterns:

```typescript
// These inputs will be REJECTED:
"'; DROP TABLE users; --"
"1' OR '1'='1"
"admin'--"
"<script>alert('xss')</script>"
"' UNION SELECT * FROM passwords --"

// Validation automatically blocks these patterns
```

---

## 🔐 SECURITY HEADERS

### Apply Security Headers

```typescript
import { setSecurityHeaders } from '@/lib/security/middleware';

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: 'your data' });
  
  // Apply comprehensive security headers
  return setSecurityHeaders(response);
}
```

**Headers Applied:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.inngest.com;
  frame-ancestors 'none';
  form-action 'self';
  upgrade-insecure-requests;
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Custom Security Headers

```typescript
import { setSecurityHeaders } from '@/lib/security/middleware';

const response = NextResponse.json({ data: 'your data' });

// Customize allowed origins for specific routes
setSecurityHeaders(response, {
  allowedOrigins: ['https://yourdomain.com', 'https://admin.yourdomain.com'],
});
```

---

## 🌐 CORS CONFIGURATION

### Apply CORS Headers

```typescript
import { setCorsHeaders } from '@/lib/security/middleware';

export async function POST(request: NextRequest) {
  // Check if request is from allowed origin
  const corsResult = setCorsHeaders(request);
  if (corsResult) return corsResult; // Returns 403 if origin not allowed
  
  // Your logic here
  const response = NextResponse.json({ success: true });
  
  // Apply CORS headers to response
  setCorsHeaders(request, response);
  return response;
}
```

**Default Allowed Origins:**
```typescript
// Edit in src/lib/security/middleware.ts
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://yourdomain.com', // Add your production domain
];
```

---

## 🚫 IP BLOCKING

### Block Malicious IPs

```typescript
import { isIPBlocked, blockIP } from '@/lib/security/middleware';

export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check if IP is blocked
  if (isIPBlocked(ip)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // Manually block an IP
  if (suspiciousActivity) {
    blockIP(ip);
  }
  
  // Your logic here
}
```

**Manage Blocked IPs:**
```typescript
// In src/lib/security/middleware.ts lines 329-352
const blockedIPs = new Set([
  '192.0.2.0', // Example malicious IP
  // Add IPs to block
]);
```

---

## 🍯 HONEYPOT DETECTION

Automatically detects and blocks suspicious activity:

```typescript
import { checkHoneypot } from '@/lib/security/middleware';

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';
  
  // Track suspicious activity
  const isSuspicious = checkHoneypot(ip, 'multiple_failed_auth');
  
  if (isSuspicious) {
    // IP automatically blocked after 10 suspicious activities
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // Your logic here
}
```

**Suspicious Activity Tracking:**
- Multiple failed login attempts
- SQL injection attempts
- XSS attempts
- Rapid requests
- Auto-blocks after 10 incidents

---

## 📝 REQUEST LOGGING

### Log API Requests

```typescript
import { logRequest } from '@/lib/security/middleware';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Your logic here
  const response = NextResponse.json({ success: true });
  
  // Log request details
  logRequest(request, response, Date.now() - startTime);
  
  return response;
}
```

**Log Format:**
```
[2024-01-15T10:30:00.000Z] POST /api/automations 200 45ms IP: 192.0.2.1
```

---

## ⚠️ ERROR HANDLING

### Safe Error Responses

```typescript
import { handleApiError } from '@/lib/security/middleware';

export async function POST(request: NextRequest) {
  try {
    // Your logic here
  } catch (error) {
    // Returns production-safe error messages
    return handleApiError(error);
  }
}
```

**Production Error Messages:**
- Hides sensitive details
- Provides generic messages to users
- Logs full error details server-side
- Returns appropriate HTTP status codes

---

## 🔧 MIDDLEWARE INTEGRATION

### Apply to API Routes

**Example: Protect Automation Endpoints**

```typescript
// src/app/api/automations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, validateInput, sanitizeInput, setSecurityHeaders, handleApiError } from '@/lib/security/middleware';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimiters.api(request);
    if (rateLimitResult) return rateLimitResult;
    
    // 2. Parse and sanitize input
    const body = await request.json();
    const cleanData = {
      title: sanitizeInput(body.title),
      trigger_type: sanitizeInput(body.trigger_type),
      message_template: sanitizeInput(body.message_template),
    };
    
    // 3. Validate input
    const validationErrors = validateInput(cleanData, {
      title: { required: true, minLength: 3, maxLength: 100 },
      trigger_type: { required: true },
      message_template: { required: true, minLength: 10 },
    });
    
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        errors: validationErrors,
      }, { status: 400 });
    }
    
    // 4. Your business logic
    const automation = await createAutomation(cleanData);
    
    // 5. Apply security headers
    const response = NextResponse.json({ automation }, { status: 201 });
    return setSecurityHeaders(response);
    
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Apply to Webhook Routes

```typescript
// src/app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, checkHoneypot, logRequest } from '@/lib/security/middleware';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.ip || 'unknown';
  
  try {
    // 1. Webhook rate limiting (1000/min)
    const rateLimitResult = await rateLimiters.webhook(request);
    if (rateLimitResult) return rateLimitResult;
    
    // 2. Check honeypot
    if (checkHoneypot(ip, 'webhook_abuse')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // 3. Process webhook
    const payload = await request.json();
    await processWebhook(payload);
    
    const response = NextResponse.json({ success: true });
    
    // 4. Log request
    logRequest(request, response, Date.now() - startTime);
    
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 📊 MONITORING BLOCKED REQUESTS

### Check Rate Limit Stats

```sql
-- View rate limit activity
SELECT 
  identifier,
  endpoint,
  request_count,
  window_start
FROM api_rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
ORDER BY request_count DESC;
```

### Check Security Events

```sql
-- View recent security events
SELECT 
  event_type,
  severity,
  ip_address,
  description,
  created_at
FROM security_events
ORDER BY created_at DESC
LIMIT 100;

-- Find IPs with multiple high-severity events
SELECT 
  ip_address,
  COUNT(*) as event_count,
  array_agg(DISTINCT event_type) as event_types
FROM security_events
WHERE severity IN ('high', 'critical')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY event_count DESC;
```

---

## 🎯 BEST PRACTICES

1. **Always rate limit public endpoints**
   ```typescript
   const rateLimitResult = await rateLimiters.api(request);
   if (rateLimitResult) return rateLimitResult;
   ```

2. **Sanitize ALL user input**
   ```typescript
   const cleanData = sanitizeInput(userInput);
   ```

3. **Validate before processing**
   ```typescript
   const errors = validateInput(data, schema);
   if (errors.length > 0) return errorResponse;
   ```

4. **Apply security headers to responses**
   ```typescript
   return setSecurityHeaders(response);
   ```

5. **Use safe error handling**
   ```typescript
   catch (error) {
     return handleApiError(error); // Never expose internal errors
   }
   ```

6. **Log critical operations**
   ```typescript
   logRequest(request, response, duration);
   ```

7. **Monitor and review security events regularly**
   - Check `security_events` table daily
   - Set up alerts for critical events
   - Block malicious IPs proactively

---

## 🚨 INCIDENT RESPONSE

If you detect an attack:

1. **Block the IP immediately**
   ```typescript
   blockIP('attacker-ip-address');
   ```

2. **Check security events**
   ```sql
   SELECT * FROM security_events 
   WHERE ip_address = 'attacker-ip' 
   ORDER BY created_at DESC;
   ```

3. **Review audit logs**
   ```sql
   SELECT * FROM audit_logs 
   WHERE ip_address = 'attacker-ip' 
   ORDER BY created_at DESC;
   ```

4. **Update rate limits if needed**
   ```typescript
   // Lower limits temporarily
   const strictLimiter = new RateLimiter({
     windowMs: 15 * 60 * 1000,
     maxRequests: 10, // Reduced from 100
   });
   ```

5. **Review and patch vulnerability**

---

## ✅ SECURITY CHECKLIST

- [ ] Rate limiting applied to all API routes
- [ ] All user input sanitized
- [ ] Input validation schemas defined
- [ ] Security headers applied to responses
- [ ] CORS configured for production domains
- [ ] Suspicious activity monitoring active
- [ ] Error handling returns safe messages
- [ ] Audit logging enabled for critical operations
- [ ] Security events reviewed regularly
- [ ] Blocked IPs list maintained

---

**🛡️ Your platform is protected with enterprise-grade security!**
