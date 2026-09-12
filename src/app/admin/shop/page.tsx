'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaBoxOpen, FaPlus } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Product = { id: string; name: string; slug: string; price: number; status: string; featured: boolean; limited_edition: boolean };
export default function AdminShopPage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  const load = async () => { if (!supabase || !isAdmin) return; const { data } = await supabase.from('products').select('id,name,slug,price,status,featured,limited_edition').order('created_at', { ascending: false }); setProducts((data || []) as Product[]); };
  useEffect(() => { void load(); }, [supabase, isAdmin]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !name.trim() || !slug.trim() || !price) return;
    const { error } = await supabase.from('products').insert({ name: name.trim(), slug: slug.trim().toLowerCase(), price: Math.round(Number(price) * 100), status: 'DRAFT' } as never);
    setMessage(error?.message || 'Draft product created. Add variants and publish when ready.'); if (!error) { setName(''); setSlug(''); setPrice(''); await load(); }
  };
  const setStatus = async (product: Product, status: 'ACTIVE' | 'ARCHIVED') => {
    if (!supabase) return;
    const { error } = await supabase.from('products').update({ status } as never).eq('id', product.id);
    setMessage(error?.message || `${product.name} is now ${status.toLowerCase()}.`);
    if (!error) await load();
  };
  if (authLoading) return <main className="min-h-screen bg-rcl-black p-20 text-center text-gray-400">Checking access…</main>;
  if (!isAdmin) return <main className="min-h-screen bg-rcl-black p-20 text-center text-white"><h1 className="font-display text-3xl uppercase">Admin access required</h1><Link href="/shop" className="rcl-link mt-5">Return to shop</Link></main>;
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="xl" className="py-10"><Link href="/admin" className="rcl-link"><FaArrowLeft /> Command center</Link><div className="mt-8 flex items-end justify-between"><div><p className="rcl-kicker">ADMIN · COMMERCE</p><h1 className="rcl-display mt-2 text-5xl uppercase">Shop management</h1></div><FaBoxOpen className="text-5xl text-rcl-orange" /></div><div className="mt-10 grid gap-8 lg:grid-cols-[1fr_2fr]"><form onSubmit={create} className="rcl-editorial rounded-2xl p-6"><h2 className="font-display text-xl uppercase">Create draft</h2><p className="mt-2 text-sm text-gray-500">Products stay private until an admin publishes them.</p><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Product name" className="mt-6 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-rcl-orange" /><input required value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="slug" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-rcl-orange" /><input required min="0" step=".01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price (USD)" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-rcl-orange" /><button className="rcl-button mt-5 inline-flex items-center gap-2"><FaPlus /> Create draft</button>{message && <p className="mt-4 text-xs text-rcl-orange">{message}</p>}</form><section><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl uppercase">Products <span className="text-rcl-orange">{products.length}</span></h2><Link href="/shop" className="rcl-link">View storefront</Link></div><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/[.04] text-[10px] uppercase tracking-widest text-gray-500"><tr><th className="p-4">Product</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-white/10"><td className="p-4 font-bold">{product.name}<span className="ml-2 text-xs text-gray-600">{product.slug}</span></td><td className="p-4">${(product.price / 100).toFixed(2)}</td><td className="p-4"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">{product.status}</span></td><td className="flex gap-2 p-4"><button type="button" onClick={() => setStatus(product, product.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')} className="text-xs font-black tracking-wider text-rcl-orange hover:text-white">{product.status === 'ACTIVE' ? 'ARCHIVE' : 'PUBLISH'}</button></td></tr>)}{products.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-gray-500">No products yet. Create the first draft to start the catalog.</td></tr>}</tbody></table></div></section></div></Container></main>;
}
