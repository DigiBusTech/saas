import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { logTelemetry } from '@/lib/telemetry';
import { trackLLMLatency } from '@/lib/performance-metrics'; // PHASE 4: Performance tracking

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
}

export interface LLMRequestOptions {
  prompt?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  /** Abort a single provider attempt after this many ms (default 30s). */
  timeoutMs?: number;
  /** Full conversation, used instead of prompt/systemInstruction (tool-calling follow-up turns). */
  messages?: LLMChatMessage[];
  /** OpenAI-compatible tool/function schemas. Omitted from the request entirely unless provided. */
  tools?: Array<Record<string, unknown>>;
  toolChoice?: 'auto' | 'none' | Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed: number;
  toolCalls?: LLMToolCall[];
  rawMessage?: Record<string, unknown>;
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
 *   - https://agentrouter.org/v1 or https://agentrouter.org/{org_id}/v1
 *   - https://api.bluesminds.com/v1
 */
function buildChatCompletionsUrl(baseUrl: string): string {
  let url = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  // If the caller already included the completions path, respect it.
  if (url.endsWith('/chat/completions')) return url;
  // If it ends with a version segment (…/v1) just append.
  return `${url}/chat/completions`;
}

function normalizeGroqModel(providerName: string, modelName: string): string {
  if (!providerName.toLowerCase().includes('groq')) return modelName;
  return modelName;
}

const GROQ_MODEL_PREFERENCES = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];
let groqModelCache: { apiKey: string; model: string; expiresAt: number } | null = null;

async function resolveAccessibleGroqModel(apiKey: string, requestedModel: string): Promise<string> {
  if (groqModelCache?.apiKey === apiKey && groqModelCache.expiresAt > Date.now()) return groqModelCache.model;

  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return requestedModel;

  const payload = await response.json();
  const available = new Set<string>((payload.data ?? []).map((model: { id: string }) => model.id));
  const model = [requestedModel, ...GROQ_MODEL_PREFERENCES].find((candidate) => available.has(candidate));
  if (!model) return requestedModel;

  groqModelCache = { apiKey, model, expiresAt: Date.now() + 15 * 60 * 1000 };
  return model;
}

/**
 * Execute a single OpenAI-compatible chat completion against one provider.
 */
async function executeSingleProvider(
  provider: ProviderConfig,
  options: LLMRequestOptions
): Promise<LLMResult> {
  const startTime = Date.now(); // PHASE 4: Track LLM latency
  const apiKey = resolveApiKey(provider.api_key_encrypted);
  const endpoint = buildChatCompletionsUrl(provider.base_url);
  let modelName = normalizeGroqModel(provider.provider_name, provider.model_name);
  if (provider.provider_name.toLowerCase().includes('groq')) {
    modelName = await resolveAccessibleGroqModel(apiKey, modelName);
  }

  const messages: LLMChatMessage[] = options.messages ?? [
    ...(options.systemInstruction ? [{ role: 'system' as const, content: options.systemInstruction }] : []),
    { role: 'user' as const, content: options.prompt ?? '' },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const body: Record<string, unknown> = {
      model: modelName,
      messages,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.maxTokens ?? 1000,
    };
    if (options.tools?.length) {
      body.tools = options.tools;
      body.tool_choice = options.toolChoice ?? 'auto';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      // Check if the response is HTML (common when hitting wrong endpoint or auth failure)
      const isHtml = errorBody.trim().toLowerCase().startsWith('<!doctype') || errorBody.trim().toLowerCase().startsWith('<html');
      if (isHtml) {
        throw new Error(
          `Provider "${provider.provider_name}" returned HTML instead of JSON (HTTP ${response.status}). ` +
          `Check that base URL "${provider.base_url}" is correct and points to an API endpoint, not a web page. ` +
          `Expected endpoint: ${endpoint}`
        );
      }
      throw new Error(
        `Provider "${provider.provider_name}" returned HTTP ${response.status}: ${errorBody.slice(0, 500)}`
      );
    }

    // Try to parse JSON, but provide helpful error if response is HTML
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      const rawText = await response.text().catch(() => '');
      const isHtml = rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.trim().toLowerCase().startsWith('<html');
      if (isHtml) {
        throw new Error(
          `Provider "${provider.provider_name}" returned HTML instead of JSON (HTTP ${response.status}). ` +
          `Check that base URL "${provider.base_url}" is correct and points to an API endpoint, not a web page. ` +
          `Expected endpoint: ${endpoint}. ` +
          `This often happens when the base URL is missing '/v1' or points to a documentation page.`
        );
      }
      throw new Error(
        `Provider "${provider.provider_name}" returned invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
        `Response preview: ${rawText.slice(0, 200)}`
      );
    }
    const message = data.choices?.[0]?.message ?? {};
    const text: string = message.content ?? '';
    const tokensUsed: number = data.usage?.total_tokens ?? 0;
    const toolCalls: LLMToolCall[] | undefined = Array.isArray(message.tool_calls)
      ? message.tool_calls.map((call: { id: string; function?: { name?: string; arguments?: string } }) => ({
          id: call.id,
          name: call.function?.name ?? '',
          arguments: call.function?.arguments ?? '{}',
        }))
      : undefined;

    if (!text && !toolCalls?.length) {
      throw new Error(`Provider "${provider.provider_name}" returned an empty completion.`);
    }

    // PHASE 4: Track LLM performance metrics
    const durationMs = Date.now() - startTime;
    await trackLLMLatency(durationMs, provider.provider_name, modelName).catch(() => {});

    return {
      text,
      provider: provider.provider_name,
      model: modelName,
      tokensUsed,
      toolCalls,
      rawMessage: message,
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
    // Priority 1: Check for OpenAI environment key (most common)
    const openaiKey = process.env.OPENAI_API_KEY || '';
    if (openaiKey) {
      const openaiProvider: ProviderConfig = {
        id: 'env-openai',
        provider_name: 'OpenAI (env fallback)',
        base_url: 'https://api.openai.com/v1',
        model_name: 'gpt-4o-mini',
        api_key_encrypted: openaiKey,
        priority: 1,
        is_primary: true,
        is_fallback: false,
        is_active: true,
      };
      try {
        return await executeSingleProvider(openaiProvider, options);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await logTelemetry({
          severity: 'warning',
          source: 'llm_router',
          message: `OpenAI env fallback failed: ${message}. Trying other fallbacks...`,
          stackTrace: err instanceof Error ? err.stack ?? null : null,
        });
        // Continue to next fallback
      }
    }

    // Priority 2: Check for Groq environment or system config key
    let configuredGroqKey = process.env.GROQ_API_KEY || '';
    const { data: groqConfig } = await db.from('system_configs').select('config_value, is_secret').eq('config_key', 'GROQ_API_KEY').maybeSingle();
    if (groqConfig?.config_value) {
      try { configuredGroqKey = groqConfig.is_secret ? decrypt(groqConfig.config_value) : groqConfig.config_value; } catch { configuredGroqKey = groqConfig.config_value; }
    }

    if (configuredGroqKey) {
      const legacyProvider: ProviderConfig = {
        id: 'env-groq',
        provider_name: 'Groq (env fallback)',
        base_url: 'https://api.groq.com/openai/v1',
        model_name: 'llama-3.1-8b-instant',
        api_key_encrypted: configuredGroqKey,
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
          message: `Groq env fallback failed: ${message}`,
          stackTrace: err instanceof Error ? err.stack ?? null : null,
        });
        throw err;
      }
    }

    await logTelemetry({
      severity: 'critical',
      source: 'llm_router',
      message: 'No active AI providers configured. Add OPENAI_API_KEY or GROQ_API_KEY to .env.local, or configure providers at /super-admin/ai-providers.',
    });
    throw new Error('LLM Router: no active AI providers configured. Add OPENAI_API_KEY or GROQ_API_KEY to environment, or configure at /super-admin/ai-providers.');
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
