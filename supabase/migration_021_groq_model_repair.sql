-- MIGRATION 021: Repair obsolete Groq model configuration

UPDATE public.ai_provider_configs
SET model_name = 'llama-3.1-8b-instant'
WHERE provider_name ILIKE '%groq%'
  AND model_name = 'llama-3.3-70b-versatile';
