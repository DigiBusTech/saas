-- MIGRATION 019: Business checkout options, custom fields, receipts, and tenant review

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS payment_options JSONB NOT NULL DEFAULT '{"methods":[],"checkout_fields":[]}'::jsonb;

CREATE TABLE IF NOT EXISTS public.workspace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_location TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_method TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','paid','cancelled')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.workspace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.workspace_orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('product','service')),
  item_id UUID NOT NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD'
);

ALTER TABLE public.workspace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace orders tenant access" ON public.workspace_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_orders.workspace_id AND w.tenant_id = public.get_my_tenant_id())
);
CREATE POLICY "Workspace order items tenant access" ON public.workspace_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_orders o JOIN public.workspaces w ON w.id = o.workspace_id WHERE o.id = workspace_order_items.order_id AND w.tenant_id = public.get_my_tenant_id())
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('checkout-receipts', 'checkout-receipts', false)
ON CONFLICT (id) DO NOTHING;
