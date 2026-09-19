'use client';

import Link from 'next/link';
import { AdminWorkspace } from '@/components/AdminWorkspace';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaBoxOpen, FaPlus } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Product = { id: string; name: string; slug: string; price: number; status: string; featured: boolean; limited_edition: boolean; description?: string | null; category_id?: string | null; collection_id?: string | null; thumbnail_url?: string | null; release_date?: string | null; };
type Variant = { id: string; product_id: string; sku: string; name: string; size: string | null; color: string | null; inventory: number; reserved: number };
export default function AdminShopPage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [variantForm, setVariantForm] = useState({ product_id: '', sku: '', name: '', size: '', color: '', inventory: 0 });
  const [inventoryReason, setInventoryReason] = useState('Admin adjustment');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  const load = async () => { if (!supabase || !isAdmin) return; const [{ data: productData }, { data: variantData }, { data: orderData }] = await Promise.all([supabase.from('products').select('*').order('created_at', { ascending: false }), supabase.from('product_variants').select('*').order('created_at', { ascending: false }), supabase.from('orders').select('id,order_number,customer_email,total,payment_status,fulfillment_status,tracking_number,created_at').order('created_at', { ascending: false }).limit(100)]); setProducts((productData || []) as Product[]); setVariants((variantData || []) as Variant[]); setOrders(orderData || []); };
  useEffect(() => { void load(); }, [supabase, isAdmin]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !name.trim() || !slug.trim() || !price) return;
    const { error } = await supabase.from('products').insert({ name: name.trim(), slug: slug.trim().toLowerCase(), price: Math.round(Number(price) * 100), status: 'DRAFT' } as never);
    setMessage(error?.message || 'Draft product created. Add variants and publish when ready.'); if (!error) { setName(''); setSlug(''); setPrice(''); await load(); }
  };
  const createVariant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !variantForm.product_id || !variantForm.sku.trim() || !variantForm.name.trim()) return;
    const { error } = await supabase.from('product_variants').insert({ ...variantForm, inventory: Number(variantForm.inventory) } as never);
    setMessage(error?.message || 'Variant created.');
    if (!error) { setVariantForm({ product_id: '', sku: '', name: '', size: '', color: '', inventory: 0 }); await load(); }
  };

  const adjustInventory = async (variant: Variant, delta: number) => {
    if (!supabase || !delta) return;
    const { error } = await supabase.rpc('adjust_shop_inventory' as never, { target_variant: variant.id, quantity_delta: delta, adjustment_reason: inventoryReason || 'Admin adjustment' } as never);
    setMessage(error?.message || 'Inventory adjusted.');
    if (!error) await load();
  };

  const updateOrder = async (orderId: string, fulfillment_status: string, tracking_number?: string | null) => {
    if (!supabase) return;
    const { error } = await supabase.from('orders').update({ fulfillment_status, tracking_number: tracking_number ?? null } as never).eq('id', orderId);
    setMessage(error?.message || 'Order updated.');
    if (!error) await load();
  };

  const setStatus = async (product: Product, status: 'ACTIVE' | 'ARCHIVED') => {
    if (!supabase) return;
    const { error } = await supabase.from('products').update({ status } as never).eq('id', product.id);
    setMessage(error?.message || `${product.name} is now ${status.toLowerCase()}.`);
    if (!error) await load();
  };
  if (authLoading) return <main className="min-h-screen bg-rcl-black p-20 text-center text-gray-400"><AdminWorkspace />Checking access…</main>;
  if (!isAdmin) return <main className="min-h-screen bg-rcl-black p-20 text-center text-white"><AdminWorkspace /><h1 className="font-display text-3xl uppercase">Admin access required</h1><Link href="/shop" className="rcl-link mt-5">Return to shop</Link></main>;
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><AdminWorkspace /><Container maxWidth="xl" className="py-10"><Link href="/admin" className="rcl-link"><FaArrowLeft /> Command center</Link><div className="mt-8 flex items-end justify-between"><div><p className="rcl-kicker">ADMIN · COMMERCE</p><h1 className="rcl-display mt-2 text-5xl uppercase">Shop management</h1></div><FaBoxOpen className="text-5xl text-rcl-orange" /></div><div className="mt-10 grid gap-8 lg:grid-cols-[1fr_2fr]"><form onSubmit={create} className="rcl-editorial rounded-2xl p-6"><h2 className="font-display text-xl uppercase">Create draft</h2><p className="mt-2 text-sm text-gray-500">Products stay private until an admin publishes them.</p><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Product name" className="mt-6 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-rcl-orange" /><input required value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="slug" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-rcl-orange" /><input required min="0" step=".01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price (USD)" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-rcl-orange" /><button className="rcl-button mt-5 inline-flex items-center gap-2"><FaPlus /> Create draft</button>{message && <p className="mt-4 text-xs text-rcl-orange">{message}</p>}</form><section><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl uppercase">Products <span className="text-rcl-orange">{products.length}</span></h2><Link href="/shop" className="rcl-link">View storefront</Link></div><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/[.04] text-[10px] uppercase tracking-widest text-gray-500"><tr><th className="p-4">Product</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-white/10"><td className="p-4 font-bold">{product.name}<span className="ml-2 text-xs text-gray-600">{product.slug}</span></td><td className="p-4">${(product.price / 100).toFixed(2)}</td><td className="p-4"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">{product.status}</span></td><td className="flex gap-2 p-4"><button type="button" onClick={() => setStatus(product, product.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')} className="text-xs font-black tracking-wider text-rcl-orange hover:text-white">{product.status === 'ACTIVE' ? 'ARCHIVE' : 'PUBLISH'}</button></td></tr>)}{products.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-gray-500">No products yet. Create the first draft to start the catalog.</td></tr>}</tbody></table></div></section></div>
<div className="mt-8 grid gap-8 lg:grid-cols-2">
  <section className="rcl-editorial rounded-2xl p-6">
    <h2 className="font-display text-xl uppercase">Variants & inventory</h2>
    <form onSubmit={createVariant} className="mt-4 grid gap-2 sm:grid-cols-2">
      <select required value={variantForm.product_id} onChange={(e) => setVariantForm({ ...variantForm, product_id: e.target.value })} className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white sm:col-span-2"><option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <input required value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="SKU" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" />
      <input required value={variantForm.name} onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })} placeholder="Variant name" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" />
      <input value={variantForm.size} onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })} placeholder="Size" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" />
      <input value={variantForm.color} onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })} placeholder="Color" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" />
      <input type="number" min="0" value={variantForm.inventory} onChange={(e) => setVariantForm({ ...variantForm, inventory: Number(e.target.value) })} placeholder="Starting inventory" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" />
      <button className="rcl-button">Add variant</button>
    </form>
    <input value={inventoryReason} onChange={(e) => setInventoryReason(e.target.value)} placeholder="Inventory adjustment reason" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white" />
    <div className="mt-4 max-h-72 space-y-2 overflow-auto">{variants.map((v) => <div key={v.id} className="rounded-lg border border-white/10 p-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="font-bold">{v.name} · {v.sku}</span><span className="text-rcl-orange">{v.inventory - v.reserved} available</span></div><div className="mt-2 flex gap-2"><button type="button" onClick={() => void adjustInventory(v, -1)} className="rounded border border-white/10 px-3 py-1">−1</button><button type="button" onClick={() => void adjustInventory(v, 1)} className="rounded bg-rcl-orange px-3 py-1 font-bold text-black">+1</button><button type="button" onClick={() => void adjustInventory(v, 10)} className="rounded border border-white/10 px-3 py-1">+10</button></div></div>)}</div>
  </section>
  <section className="rcl-editorial rounded-2xl p-6">
    <h2 className="font-display text-xl uppercase">Order fulfillment</h2>
    <div className="mt-4 max-h-96 space-y-2 overflow-auto">{orders.map((o) => <div key={o.id} className="rounded-lg border border-white/10 p-3 text-xs"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{o.order_number}</p><p className="mt-1 text-white/40">{o.customer_email} · ${((o.total ?? 0) / 100).toFixed(2)}</p></div><select value={o.fulfillment_status} onChange={(e) => void updateOrder(o.id, e.target.value, o.tracking_number)} className="rounded border border-white/10 bg-black/30 p-2 text-white">{['UNFULFILLED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map((v) => <option key={v}>{v}</option>)}</select></div><input defaultValue={o.tracking_number ?? ''} onBlur={(e) => { if (e.target.value !== (o.tracking_number ?? '')) void updateOrder(o.id, o.fulfillment_status, e.target.value || null); }} placeholder="Tracking number" className="mt-2 w-full rounded border border-white/10 bg-black/30 p-2 text-xs text-white" /></div>)}{orders.length === 0 && <p className="text-sm text-gray-500">No orders.</p>}</div>
  </section>
</div></Container></main>;
}
