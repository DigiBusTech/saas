-- MIGRATION 020: Super Admin-managed Inngest runtime configuration

INSERT INTO public.system_configs (config_key, config_value, description, is_secret)
VALUES
  ('INNGEST_EVENT_KEY', '', 'Inngest event key used by webhooks, knowledge ingestion, automations, and web chat.', TRUE),
  ('INNGEST_SIGNING_KEY', '', 'Inngest signing key used by the /api/inngest function endpoint.', TRUE),
  ('NEXT_PUBLIC_APP_URL', '', 'Canonical public URL used for generated webhook URLs.', FALSE)
ON CONFLICT (config_key) DO NOTHING;
