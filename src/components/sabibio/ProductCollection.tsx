'use client';

import { ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';

type Product = { id: string; name: string; description: string | null; price: number; currency: string; image_url: string | null; payment_link: string | null };

export function ProductCollection({ products, primary, radius, grid }: { products: Product[]; primary: string; radius: string; grid: boolean }) {
  const [cart, setCart] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const add = (product: Product) => setCart((items) => items.some((item) => item.id === product.id) ? items : [...items, product]);
  const total = cart.reduce((sum, product) => sum + product.price, 0);
  return <>
    <section className={`mt-8 ${grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'space-y-3'}`}>
      {products.map((product) => <div key={product.id} className="overflow-hidden border" style={{ borderColor: `${primary}55`, background: `${primary}12`, borderRadius: radius }}>
        {product.image_url && <img src={product.image_url} alt="" className="h-28 w-full object-cover" />}
        <div className="p-3"><p className="text-xs font-semibold">{product.name}</p><p className="mt-1 text-[10px] text-white/55">{product.description}</p><p className="mt-2 text-xs font-bold" style={{ color: primary }}>{product.currency} {product.price}</p><button onClick={() => add(product)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold text-black" style={{ background: primary }}><ShoppingBag className="h-3 w-3" /> Add to cart</button></div>
      </div>)}
    </section>
    {cart.length > 0 && <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full px-4 py-3 text-xs font-bold text-black shadow-xl" style={{ background: primary }}><ShoppingBag className="h-4 w-4" /> Cart ({cart.length})</button>}
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1620] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Your cart</h2><button onClick={() => setOpen(false)}><X className="h-4 w-4 text-white/50" /></button></div><div className="mt-4 space-y-2">{cart.map((product) => <div key={product.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-xs text-white"><span>{product.name}</span><span>{product.currency} {product.price}</span></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm font-bold text-white"><span>Total</span><span>{cart[0]?.currency} {total}</span></div><div className="mt-4 space-y-2">{cart.map((product) => product.payment_link && <a key={product.id} href={product.payment_link} target="_blank" rel="noreferrer" className="block rounded-lg py-2.5 text-center text-xs font-bold text-black" style={{ background: primary }}>Checkout {product.name}</a>)}<p className="text-center text-[10px] text-white/40">Checkout opens the business payment link.</p></div></div></div>}
  </>;
}
