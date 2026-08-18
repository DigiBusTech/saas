-- MIGRATION 012: Atomic usage-counter RPCs (previously called but never defined,
-- so token/message usage tracking and plan-limit enforcement were silent no-ops)

CREATE OR REPLACE FUNCTION public.increment_token_usage(tenant_id_input UUID, tokens BIGINT)
RETURNS VOID
LANGUAGE sql
AS $$
    UPDATE public.tenants
    SET token_usage = token_usage + GREATEST(tokens, 0)
    WHERE id = tenant_id_input;
$$;

CREATE OR REPLACE FUNCTION public.increment_message_usage(tenant_id_input UUID, amount INT DEFAULT 1)
RETURNS VOID
LANGUAGE sql
AS $$
    UPDATE public.tenants
    SET message_usage = message_usage + GREATEST(amount, 0)
    WHERE id = tenant_id_input;
$$;

GRANT EXECUTE ON FUNCTION public.increment_token_usage(UUID, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_message_usage(UUID, INT) TO service_role;
