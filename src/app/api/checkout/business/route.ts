import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const schema = z.object({
  workspaceId: z.string().uuid(),
  items: z.array(z.object({ id: z.string().uuid(), type: z.enum(['product', 'service']), quantity: z.number().int().min(1).max(99) })).min(1),
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email(),
  location: z.string().max(200).optional(),
  paymentMethod: z.string().min(1),
  customFields: z.record(z.string(), z.string()).default({}),
  receiptUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Complete the required checkout fields.' }, { status: 400 });
  const input = parsed.data;
  const db = createServiceClient();
  const { data: workspace } = await db.from('workspaces').select('id, payment_options').eq('id', input.workspaceId).eq('is_active', true).single();
  if (!workspace) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  const options = (workspace.payment_options ?? {}) as { methods?: Array<{ provider: string; enabled?: boolean }> };
  if (!options.methods?.some((method) => method.provider === input.paymentMethod && method.enabled !== false)) return NextResponse.json({ error: 'This payment method is not available.' }, { status: 400 });

  const ids = input.items.map((item) => item.id);
  const [{ data: products }, { data: services }] = await Promise.all([
    db.from('workspace_products').select('id,name,price,currency,payment_link').eq('workspace_id', input.workspaceId).in('id', ids),
    db.from('workspace_services').select('id,name,price,currency,payment_link').eq('workspace_id', input.workspaceId).in('id', ids),
  ]);
  const catalog = [...(products ?? []).map((item) => ({ ...item, type: 'product' as const })), ...(services ?? []).map((item) => ({ ...item, type: 'service' as const }))];
  const lineItems = input.items.map((item) => { const found = catalog.find((candidate) => candidate.id === item.id && candidate.type === item.type); return found ? { ...found, quantity: item.quantity } : null; }).filter(Boolean) as Array<{ id: string; name: string; price: number; currency: string; type: 'product' | 'service'; quantity: number }>;
  if (lineItems.length !== input.items.length) return NextResponse.json({ error: 'One or more items are no longer available.' }, { status: 400 });
  const currency = lineItems[0].currency;
  const total = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { data: order, error } = await db.from('workspace_orders').insert({ workspace_id: input.workspaceId, customer_name: input.customerName, customer_email: input.customerEmail, customer_location: input.location ?? null, custom_fields: input.customFields, payment_method: input.paymentMethod, receipt_url: input.receiptUrl ?? null, total, currency }).select('id').single();
  if (error || !order) return NextResponse.json({ error: error?.message ?? 'Could not create order' }, { status: 500 });
  await db.from('workspace_order_items').insert(lineItems.map((item) => ({ order_id: order.id, item_type: item.type, item_id: item.id, title: item.name, quantity: item.quantity, unit_price: item.price, currency: item.currency })));
  return NextResponse.json({ orderId: order.id, status: 'pending_review', message: 'Your order was submitted for business review.' });
}
