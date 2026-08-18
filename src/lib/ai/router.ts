import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { logTelemetry } from '@/lib/telemetry';

export interface LLMRequestOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  /** Abort a single provider attempt after this many ms (default 30s). */
  timeoutMs?: number;
}

export interface LLMResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed: number;
}

interface ProviderConfig {
  id: string;
  provider_name: string;
  base_url: string;
  model_name: string;
  api_key_encrypted: string;
  priority: number;
  is_primary: boolean;
  is_fallback: boolean;
  is_active: boolean;
}

/**
 * Safely decrypt a stored API key. Falls back to the raw value if it was
 * stored unencrypted (defensive — some rows may be seeded in plaintext).
 */
function resolveApiKey(encrypted: string): string {
  try {
    return decrypt(encrypted);
  } catch {
    return encrypted;
  }
}

/**
 * Normalize a base URL into a full chat completions endpoint.
 * Supports custom OpenAI-compatible endpoints such as:
 *   - https://api.openai.com/v1
 *   - https://api.groq.com/openai/v1
 *   - https://agentrouter.org/
 *   - https://api.bluesminds.com/v1
 */
function buildChatCompletionsUrl(baseUrl: string): string {
  let url = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  // If the caller already included the completions path, respect it.
  if (url.endsWith('/chat/completions')) return url;
  // If it ends with a version segment (…/v1) just append.
  return `${url}/chat/completions`;
}

/**
 * Execute a single OpenAI-compatible chat completion against one provider.
 */
async function executeSingleProvider(
  provider: ProviderConfig,
  options: LLMRequestOptions
): Promise<LLMResult> {
  const apiKey = resolveApiKey(provider.api_key_encrypted);
  const endpoint = buildChatCompletionsUrl(provider.base_url);

  const messages = [];
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: options.prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model_name,
        messages,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 1000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Provider "${provider.provider_name}" returned HTTP ${response.status}: ${errorBody.slice(0, 500)}`
      );
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    const tokensUsed: number = data.usage?.total_tokens ?? 0;

    if (!text) {
      throw new Error(`Provider "${provider.provider_name}" returned an empty completion.`);
    }

    return {
      text,
      provider: provider.provider_name,
      model: provider.model_name,
      tokensUsed,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Central Multi-LLM Router.
 *
 * Fetches all active providers ordered by priority ASC, attempts the primary,
 * and gracefully fails over to each fallback in turn. Every failure is logged
 * as a warning to `system_telemetry_logs`. Throws only if ALL providers fail.
 */
export async function executeLLMRequest(options: LLMRequestOptions): Promise<LLMResult> {
  const db = createServiceClient();

  const { data: providers, error } = await db
    .from('ai_provider_configs')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    await logTelemetry({
      severity: 'critical',
      source: 'llm_router',
      message: `Failed to load AI provider configs: ${error.message}`,
    });
    throw new Error(`LLM Router: unable to load provider configs — ${error.message}`);
  }

  const active = (providers ?? []) as ProviderConfig[];

  if (active.length === 0) {
    // Graceful degradation: fall back to the legacy GROQ_API_KEY env if present.
    if (process.env.GROQ_API_KEY) {
      const legacyProvider: ProviderConfig = {
        id: 'env-groq',
        provider_name: 'Groq (env fallback)',
        base_url: 'https://api.groq.com/openai/v1',
        model_name: 'llama-3.3-70b-versatile',
        api_key_encrypted: process.env.GROQ_API_KEY,
        priority: 999,
        is_primary: true,
        is_fallback: false,
        is_active: true,
      };
      try {
        return await executeSingleProvider(legacyProvider, options);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await logTelemetry({
          severity: 'critical',
          source: 'llm_router',
          message: `Legacy GROQ env fallback failed: ${message}`,
          stackTrace: err instanceof Error ? err.stack ?? null : null,
        });
        throw err;
      }
    }

    await logTelemetry({
      severity: 'critical',
      source: 'llm_router',
      message: 'No active AI providers configured. Configure providers at /super-admin/ai-providers.',
    });
    throw new Error('LLM Router: no active AI providers configured.');
  }

  // Order: primary first, then remaining by priority.
  const ordered = [
    ...active.filter((p) => p.is_primary),
    ...active.filter((p) => !p.is_primary),
  ];

  const failures: string[] = [];

  for (const provider of ordered) {
    try {
      const result = await executeSingleProvider(provider, options);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${provider.provider_name}: ${message}`);

      // Log a warning for each failed provider and continue to the next fallback.
      await logTelemetry({
        severity: 'warning',
        source: 'llm_router',
        endpoint: provider.base_url,
        message: `LLM provider "${provider.provider_name}" failed, attempting fallover. ${message}`,
        stackTrace: err instanceof Error ? err.stack ?? null : null,
        metadata: {
          provider_id: provider.id,
          model: provider.model_name,
          priority: provider.priority,
        },
      });
    }
  }

  // All providers failed → escalate to critical and throw.
  await logTelemetry({
    severity: 'critical',
    source: 'llm_router',
    message: `All ${ordered.length} AI provider(s) failed. Failures: ${failures.join(' | ')}`,
  });

  throw new Error(`LLM Router: all providers failed. ${failures.join(' | ')}`);
}

/**
 * Lightweight connectivity test for a single provider config (used by the
 * Super Admin "Test Connection" button). Sends a trivial "ping" prompt.
 */
export async function testProviderConnection(params: {
  base_url: string;
  model_name: string;
  apiKey: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const start = Date.now();
  const provider: ProviderConfig = {
    id: 'test',
    provider_name: 'Connection Test',
    base_url: params.base_url,
    model_name: params.model_name,
    api_key_encrypted: params.apiKey,
    priority: 0,
    is_primary: true,
    is_fallback: false,
    is_active: true,
  };

  try {
    const result = await executeSingleProvider(provider, {
      prompt: 'ping',
      systemInstruction: 'Reply with the single word: pong',
      temperature: 0,
      maxTokens: 8,
      timeoutMs: params.timeoutMs ?? 15_000,
    });
    return {
      ok: true,
      latencyMs: Date.now() - start,
      message: `Connected. Model responded: "${result.text.slice(0, 60)}"`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, message };
  }
}
