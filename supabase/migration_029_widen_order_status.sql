-- MIGRATION 029: Widen workspace_orders status values for order lifecycle tracking
-- Additive only — existing values are preserved, new ones are added so the
-- order/status.updated broadcast worker can notify on processing/shipped/completed.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.workspace_orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%pending_review%'
  LOOP
    EXECUTE format('ALTER TABLE public.workspace_orders DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.workspace_orders
  ADD CONSTRAINT workspace_orders_status_check
  CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid', 'processing', 'shipped', 'completed', 'cancelled'));
