-- MIGRATION 025: Restore the missing messages.approval_status column
-- Every channel (Telegram, WhatsApp, Web) has been failing at save-user-message
-- because this column was never migrated to production, only assumed by app code.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'sent'
  CHECK (approval_status IN ('sent', 'pending_approval', 'discarded'));
