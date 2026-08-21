import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/health
 * 
 * Production health check endpoint
 * Tests database connectivity, environment variables, and system status
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; latency?: number }> = {};

  try {
    // 1. Database connectivity check
    const dbStart = Date.now();
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from('tenants').select('id').limit(1);
      
      if (error) throw error;
      
      checks.database = {
        status: 'ok',
        latency: Date.now() - dbStart,
      };
    } catch (error: any) {
      checks.database = {
        status: 'error',
        message: error.message || 'Database connection failed',
      };
    }

    // 2. Environment variables check
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL',
    ];

    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    checks.environment = {
      status: missingEnvVars.length === 0 ? 'ok' : 'error',
      message: missingEnvVars.length > 0 ? `Missing: ${missingEnvVars.join(', ')}` : undefined,
    };

    // 3. External API checks (optional)
    const optionalAPIs = [
      { name: 'WhatsApp', key: 'WHATSAPP_ACCESS_TOKEN' },
      { name: 'Telegram', key: 'TELEGRAM_BOT_TOKEN' },
      { name: 'OpenAI', key: 'OPENAI_API_KEY' },
      { name: 'Resend', key: 'RESEND_API_KEY' },
      { name: 'Inngest', key: 'INNGEST_SIGNING_KEY' },
    ];

    checks.apis = {
      status: 'ok',
      message: optionalAPIs
        .filter(api => !process.env[api.key])
        .map(api => `${api.name} not configured`)
        .join(', ') || 'All optional APIs configured',
    };

    // 4. System metrics
    checks.system = {
      status: 'ok',
      message: JSON.stringify({
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        },
      }),
    };

    // Overall status
    const overallStatus = Object.values(checks).every(c => c.status === 'ok') ? 'ok' : 'degraded';
    const totalLatency = Date.now() - startTime;

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      latency: `${totalLatency}ms`,
      checks,
    }, {
      status: overallStatus === 'ok' ? 200 : 503,
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks,
    }, {
      status: 500,
    });
  }
}
