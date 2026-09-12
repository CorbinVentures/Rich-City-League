'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaBagShopping, FaHeart } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';

type Product = { id: string; name: string; slug: string; description: string | null; short_description: string | null; price: number; compare_at_price: number | null; status: string; limited_edition: boolean; thumbnail_url: string | null; images: unknown; release_date: string | null; category?: { name: string } | null; collection?: { name: string } | null };
type Variant = { id: string; name: string; size: string | null; color: string | null; inventory: number };
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Variant | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase || !slug) return;
    void (async () => {
      const { data } = await supabase.from('products').select('*, category:shop_categories(name), collection:shop_collections(name), variants:product_variants(*)').eq('slug', slug).maybeSingle();
      if (data) {
        const row = data as unknown as Product & { variants?: Variant[] };
        setProduct(row); setVariants(row.variants || []); setSelected(row.variants?.find((variant) => variant.inventory > 0) || row.variants?.[0] || null);
      }
    })();
  }, [supabase, slug]);
  if (!product) return <main className="min-h-screen bg-rcl-black p-20 text-center text-gray-400">Loading product…</main>;
  const image = product.thumbnail_url || (Array.isArray(product.images) && typeof product.images[0] === 'string' ? product.images[0] : null);
  const soldOut = product.status === 'SOLD_OUT' || (variants.length > 0 && variants.every((variant) => variant.inventory <= 0));
  const add = () => {
    if (soldOut || (variants.length > 0 && !selected)) return;
    const current = JSON.parse(localStorage.getItem('rcl-cart') || '[]') as Array<{ product: Product; quantity: number; variant?: Variant }>;
    const key = `${product.id}-${selected?.id || 'default'}`;
    const existing = current.find((line) => `${line.product.id}-${line.variant?.id || 'default'}` === key);
    localStorage.setItem('rcl-cart', JSON.stringify(existing ? current.map((line) => `${line.product.id}-${line.variant?.id || 'default'}` === key ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, variant: selected, quantity: 1 }]));
    setMessage('Added to your bag.');
  };
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="xl" className="py-10"><Link href="/shop" className="rcl-link"><FaArrowLeft /> Back to shop</Link><div className="mt-10 grid gap-10 lg:grid-cols-2"><div className="overflow-hidden rounded-3xl bg-rcl-navy"><div className="aspect-square">{image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-end p-8"><span className="rcl-display text-[10rem] text-white/10">RCL</span></div>}</div></div><div className="py-4"><p className="rcl-kicker">{product.collection?.name || product.category?.name || 'RCL SHOP'}</p><h1 className="rcl-display mt-4 text-5xl uppercase sm:text-7xl">{product.name}</h1><div className="mt-5 text-2xl font-bold">{money(product.price)} {product.compare_at_price && <del className="ml-3 text-base text-gray-600">{money(product.compare_at_price)}</del>}</div><p className="mt-6 max-w-xl leading-7 text-gray-400">{product.description || product.short_description || 'Official Rich City League gear.'}</p>{variants.length > 0 && <div className="mt-8"><p className="text-xs font-black uppercase tracking-widest text-gray-400">Select variant</p><div className="mt-3 flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.id} type="button" disabled={variant.inventory <= 0} onClick={() => setSelected(variant)} className={`rounded-full border px-4 py-3 text-xs font-black uppercase ${selected?.id === variant.id ? 'border-rcl-orange bg-rcl-orange text-black' : 'border-white/15 text-white'} disabled:cursor-not-allowed disabled:opacity-30`}>{variant.name}</button>)}</div></div>}<div className="mt-8 flex gap-3"><button type="button" onClick={add} disabled={soldOut} className="rcl-button flex-1 disabled:cursor-not-allowed disabled:opacity-40">{soldOut ? 'Sold out' : <><FaBagShopping /> Add to bag</>}</button><button type="button" aria-label="Save product" className="rounded-xl border border-white/15 px-5 hover:border-rcl-orange hover:text-rcl-orange"><FaHeart /></button></div>{message && <p role="status" className="mt-4 text-sm text-rcl-orange">{message}</p>}<div className="mt-10 border-t border-white/10 pt-6 text-sm text-gray-500"><p>Shipping calculated at checkout.</p><p className="mt-2">30-day returns on unworn items.</p></div></div></div></Container></main>;
}
