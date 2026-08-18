-- MIGRATION 016: SabiBio web chat channel

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.conversations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%platform%telegram%whatsapp%'
  LOOP
    EXECUTE format('ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_platform_check
  CHECK (platform IN ('telegram', 'whatsapp', 'web'));

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_platform_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_platform_check
  CHECK (platform IN ('telegram', 'whatsapp', 'web'));
