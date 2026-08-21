-- MIGRATION 032: Service Orders & Monthly/Annual Billing Support
-- Extends workspace_orders to distinguish product sales from service bookings,
-- and adds monthly/annual pricing to subscription_plans.

-- 1. Extend workspace_orders for service bookings
ALTER TABLE public.workspace_orders
  ADD COLUMN IF NOT EXISTS order_type TEXT CHECK (order_type IN ('product', 'service')) DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS service_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_notes TEXT,
  ADD COLUMN IF NOT EXISTS service_status TEXT CHECK (service_status IN ('inquiry', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- Backfill existing rows to 'product' type
UPDATE public.workspace_orders SET order_type = 'product' WHERE order_type IS NULL;

-- Create index for filtering by order type
CREATE INDEX IF NOT EXISTS idx_workspace_orders_type ON public.workspace_orders (workspace_id, order_type);

-- 2. Extend subscription_plans for monthly/annual billing intervals
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_monthly_usd INTEGER,
  ADD COLUMN IF NOT EXISTS price_annual_usd INTEGER,
  ADD COLUMN IF NOT EXISTS price_monthly_ngn INTEGER,
  ADD COLUMN IF NOT EXISTS price_annual_ngn INTEGER,
  ADD COLUMN IF NOT EXISTS annual_discount_percentage NUMERIC(4, 2) DEFAULT 16.67;

-- Backfill monthly pricing from existing price_usd/price_ngn (which represent monthly)
UPDATE public.subscription_plans 
SET 
  price_monthly_usd = price_usd,
  price_monthly_ngn = price_ngn,
  price_annual_usd = FLOOR(price_usd * 10),
  price_annual_ngn = FLOOR(price_ngn * 10)
WHERE price_monthly_usd IS NULL;

-- 3. Add billing_interval to workspaces to track monthly vs annual subscriptions
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annual')) DEFAULT 'monthly';

COMMENT ON COLUMN public.workspace_orders.order_type IS 'Distinguishes product purchases from service bookings';
COMMENT ON COLUMN public.workspace_orders.service_date IS 'Scheduled appointment date/time for service bookings';
COMMENT ON COLUMN public.workspace_orders.service_status IS 'Lifecycle status for service bookings';
COMMENT ON COLUMN public.subscription_plans.price_monthly_usd IS 'Monthly subscription price in USD cents';
COMMENT ON COLUMN public.subscription_plans.price_annual_usd IS 'Annual subscription price in USD cents (typically 10 months worth)';
COMMENT ON COLUMN public.subscription_plans.annual_discount_percentage IS 'Percentage discount for annual billing (default 16.67% = 2 months free)';
