-- MIGRATION 028: Expose OPENAI_API_KEY in Super Admin Configs for embeddings
-- Additive seed only — embeddings previously silently used the Groq key
-- against OpenAI's endpoint, which always failed since Groq has no
-- embeddings API. Setting this key here (or the OPENAI_API_KEY env var)
-- enables real knowledge-base vectorization.

INSERT INTO public.system_configs (config_key, config_value, description, is_secret)
VALUES ('OPENAI_API_KEY', '', 'OpenAI API key used only for knowledge base embeddings (text-embedding-3-small)', TRUE)
ON CONFLICT (config_key) DO NOTHING;
