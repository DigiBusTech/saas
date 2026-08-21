'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, X, Loader2, Pencil, Trash2, ExternalLink, DollarSign, ImageIcon,
} from 'lucide-react';
import type { Workspace, WorkspaceProduct } from '@/lib/types/database';
import { createProduct, updateProduct, deleteProduct } from './actions';

interface Props {
  workspace: Workspace;
  initialProducts: WorkspaceProduct[];
}

export function ProductsClient({ workspace, initialProducts }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WorkspaceProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);

    let result;
    if (editingProduct) {
      result = await updateProduct(editingProduct.id, workspace.id, fd);
    } else {
      result = await createProduct(workspace.id, fd);
    }

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setShowModal(false);
    setEditingProduct(null);
    // Refresh via router would be better, but for instant feedback:
    window.location.reload();
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product?')) return;
    await deleteProduct(productId, workspace.id);
    setProducts(products.filter((p) => p.id !== productId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Products & Services
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage offerings for <span className="text-indigo-500 dark:text-indigo-400 font-medium">{workspace.name}</span>
          </p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setError(''); setShowModal(true); }}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600
            hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="rounded-xl bg-card backdrop-blur-md border border-border p-12 text-center">
          <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No products yet. Add your first product or service.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
              className="group rounded-xl bg-card backdrop-blur-md border border-border
                hover:border-indigo-500/40 transition-all duration-300 overflow-hidden"
            >
              {/* Image */}
              {product.image_url ? (
                <div className="h-36 bg-muted overflow-hidden">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="h-36 bg-linear-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-bold text-foreground">
                      {product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase">{product.currency}</span>
                  </div>

                  {product.payment_link && (
                    <a
                      href={product.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition"
                    >
                      Pay Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {(product.code || !product.is_active) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {product.code && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-mono">{product.code}</span>}
                    {!product.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">Inactive</span>}
                  </div>
                )}

                <div className="flex gap-2 pt-1 border-t border-border">
                  <button
                    onClick={() => { setEditingProduct(product); setError(''); setShowModal(true); }}
                    className="flex-1 py-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 py-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 transition flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-lg flex-col mx-4 bg-card backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                  <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs">{error}</div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Product Name</label>
                  <input name="name" defaultValue={editingProduct?.name} required
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                  <p className="text-[10px] text-muted-foreground mt-1">The display name your customers will see when the AI shares this product.</p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Description</label>
                  <textarea name="description" defaultValue={editingProduct?.description ?? ''} rows={2}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition resize-none" />
                  <p className="text-[10px] text-muted-foreground mt-1">A brief summary the AI uses to describe this product to leads. Keep it concise and benefit-focused.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Price</label>
                    <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                    <p className="text-[10px] text-muted-foreground mt-1">Enter the price in your selected currency. Ensure this matches your Stripe/Flutterwave configuration.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Currency</label>
                    <select name="currency" defaultValue={editingProduct?.currency ?? 'USD'}
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition appearance-none">
                      <option value="USD">USD</option>
                      <option value="NGN">NGN</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">Must match the currency set in your payment gateway.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Image URL</label>
                  <input name="image_url" defaultValue={editingProduct?.image_url ?? ''} placeholder="https://example.com/product.jpg"
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                  <p className="text-[10px] text-muted-foreground mt-1">A direct URL to the product image. The AI sends this as a rich-media card to customers.</p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Payment Link</label>
                  <input name="payment_link" defaultValue={editingProduct?.payment_link ?? ''} placeholder="https://pay.stripe.com/..."
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                  <p className="text-[10px] text-muted-foreground mt-1">Paste your Stripe/Flutterwave payment link. The AI includes this as a CTA button in product cards.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Product Code</label>
                    <input name="code" defaultValue={editingProduct?.code ?? ''} placeholder="PRD-101"
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                    <p className="text-[10px] text-muted-foreground mt-1">Used by the AI to look up this item in chat.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Checkout URL</label>
                    <input name="checkout_url" defaultValue={editingProduct?.checkout_url ?? ''} placeholder="https://sabibio.link/checkout?..."
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                    <p className="text-[10px] text-muted-foreground mt-1">Overrides the default checkout link if set.</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="is_active" value="true" defaultChecked={editingProduct?.is_active ?? true} className="accent-indigo-500" />
                  Active (visible to the AI and customers)
                </label>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-card shrink-0">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
