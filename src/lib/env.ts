import { z } from 'zod';

/**
 * Centralised, typed environment variable loader.
 *
 * The project currently relies on a handful of Supabase and Stripe keys.
 * This helper validates them at runtime and provides a typed `env` object
 * that can be imported throughout the codebase.
 */
export const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    // Service role key is optional for local dev – see createServiceClient fallback.
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    // Add any other env vars you need here, e.g. OpenAI keys, Inngest token, etc.
  })
  .parse(process.env);

export type Env = typeof env;
