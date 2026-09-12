'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaBagShopping, FaHeart, FaMagnifyingGlass, FaArrowRight, FaXmark } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';

type Product = {
  id: string; name: string; slug: string; description: string | null; short_description: string | null;
  price: number; compare_at_price: number | null; status: string; featured: boolean; limited_edition: boolean;
  thumbnail_url: string | null; images: unknown; release_date: string | null; edition_size: number | null;
  category?: { name: string; slug: string } | null; collection?: { name: string } | null;
};
type CartLine = { product: Product; quantity: number };
const categories = ['ALL', 'APPAREL', 'HEADWEAR', 'ACCESSORIES', 'TEAM GEAR', 'LIMITED EDITION'];
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

function ProductCard({ product, onAdd, onFavorite }: { product: Product; onAdd: (product: Product) => void; onFavorite: (product: Product) => void }) {
  const image = product.thumbnail_url || (Array.isArray(product.images) && typeof product.images[0] === 'string' ? product.images[0] : null);
  const soldOut = product.status === 'SOLD_OUT';
  return (
    <article className="group relative">
      <Link href={`/shop/${product.slug}`} className="block overflow-hidden rounded-2xl bg-[#101c2d]">
        <div className="relative aspect-[4/5] overflow-hidden bg-[linear-gradient(135deg,#172b42,#07101d)]">
          {image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-end p-5"><span className="rcl-display text-7xl text-white/10">RCL</span></div>}
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-black tracking-widest text-rcl-orange">{soldOut ? 'SOLD OUT' : product.limited_edition ? 'LIMITED' : 'RCL GEAR'}</span>
          <button type="button" aria-label={`Save ${product.name}`} onClick={(event) => { event.preventDefault(); onFavorite(product); }} className="absolute right-3 top-3 rounded-full bg-black/60 p-3 text-white hover:text-rcl-orange"><FaHeart /></button>
        </div>
      </Link>
      <div className="flex items-start justify-between gap-3 py-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">{product.collection?.name || product.category?.name || 'RCL SHOP'}</p><Link href={`/shop/${product.slug}`} className="mt-1 block font-display text-lg font-bold uppercase text-white">{product.name}</Link><p className="mt-1 text-sm text-gray-400">{money(product.price)} {product.compare_at_price ? <del className="ml-2 text-gray-600">{money(product.compare_at_price)}</del> : null}</p></div>
        {!soldOut && <button type="button" onClick={() => onAdd(product)} className="mt-1 rounded-full border border-rcl-orange/60 px-3 py-2 text-[10px] font-black tracking-widest text-rcl-orange hover:bg-rcl-orange hover:text-black">QUICK ADD</button>}
      </div>
    </article>
  );
}

export default function ShopPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem('rcl-cart') || '[]')); } catch { setCart([]); }
  }, []);
  useEffect(() => { localStorage.setItem('rcl-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.from('products').select('*, category:shop_categories(name,slug), collection:shop_collections(name)').order('featured', { ascending: false }).order('created_at', { ascending: false });
      setProducts((data || []) as unknown as Product[]);
    })();
  }, [supabase]);

  const visible = products.filter((product) => {
    const matchesCategory = category === 'ALL' || (category === 'LIMITED EDITION' ? product.limited_edition : product.category?.name?.toUpperCase() === category);
    const haystack = `${product.name} ${product.description || ''} ${product.collection?.name || ''}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  });
  const picks = products.filter((product) => product.featured).slice(0, 4);
  const drops = products.filter((product) => product.limited_edition).slice(0, 3);
  const addToCart = (product: Product) => {
    setCart((current) => { const existing = current.find((line) => line.product.id === product.id); return existing ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, quantity: 1 }]; });
    setDrawerOpen(true);
  };
  const favorite = async (product: Product) => {
    if (!supabase) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setNotice('Sign in to save gear.'); setTimeout(() => setNotice(''), 2500); return; }
    const { error } = await supabase.from('product_favorites').upsert({ product_id: product.id, user_id: userId } as never);
    setNotice(error ? 'Sign in to save gear.' : 'Saved to your gear.');
    setTimeout(() => setNotice(''), 2500);
  };
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <section className="rcl-texture relative overflow-hidden border-b border-white/10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(77,163,255,.22),transparent_35%),linear-gradient(125deg,#101c2d,#07090d)] py-20">
        <Container maxWidth="xl"><p className="rcl-kicker">RCL SHOP · RICHMOND, VA</p><h1 className="rcl-display mt-4 max-w-3xl text-6xl uppercase leading-[.9] sm:text-8xl">Gear the <span className="text-rcl-orange">culture.</span></h1><p className="mt-6 max-w-lg text-lg text-gray-400">Premium pieces for the people, players, and places that make 804 basketball.</p><button type="button" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} className="rcl-button mt-8 inline-flex items-center gap-3">Shop the collection <FaArrowRight /></button></Container>
      </section>
      <Container maxWidth="xl" className="py-10">
        <div className="flex items-center justify-between gap-4"><div className="flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-black tracking-widest ${category === item ? 'bg-rcl-orange text-black' : 'border border-white/10 text-gray-400 hover:border-rcl-orange hover:text-white'}`}>{item}</button>)}</div><button type="button" aria-label="Open shopping bag" onClick={() => setDrawerOpen(true)} className="relative rounded-full border border-white/10 p-3 hover:border-rcl-orange"><FaBagShopping />{cartCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rcl-orange text-[10px] font-black text-black">{cartCount}</span>}</button></div>
        {picks.length > 0 && <section className="mt-12"><div className="mb-5 flex items-end justify-between"><div><p className="rcl-kicker">EDITORIAL SELECTION</p><h2 className="rcl-display mt-2 text-4xl uppercase">RCL Picks</h2></div></div><div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">{picks.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onFavorite={favorite} />)}</div></section>}
        {drops.length > 0 && <section className="mt-16 rounded-3xl bg-rcl-navy/80 p-6 sm:p-10"><p className="rcl-kicker">LIMITED QUANTITY · DROP CULTURE</p><h2 className="rcl-display mt-2 text-4xl uppercase">RCL Drops</h2><div className="mt-6 grid gap-5 md:grid-cols-3">{drops.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onFavorite={favorite} />)}</div></section>}
        <section id="catalog" className="mt-16"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="rcl-kicker">OFFICIAL MERCHANDISE</p><h2 className="rcl-display mt-2 text-4xl uppercase">The Collection</h2></div><label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-gray-400"><FaMagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search gear" className="w-44 bg-transparent text-sm text-white outline-none placeholder:text-gray-600" /></label></div>{visible.length > 0 ? <div className="mt-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">{visible.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onFavorite={favorite} />)}</div> : <div className="rcl-editorial mt-8 rounded-3xl p-12 text-center"><FaBagShopping className="mx-auto text-4xl text-rcl-orange" /><h3 className="mt-5 font-display text-2xl uppercase">{products.length === 0 ? 'No products yet' : 'No results'}</h3><p className="mt-2 text-sm text-gray-500">{products.length === 0 ? 'The next RCL collection will land here when it is published.' : 'Try another search or category.'}</p>{products.length === 0 && <Link href="/admin/shop" className="rcl-link mt-5">Manage catalog <FaArrowRight /></Link>}</div>}</section>
      </Container>
      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-rcl-orange px-5 py-3 text-xs font-black uppercase tracking-widest text-black">{notice}</div>}
      {drawerOpen && <div className="fixed inset-0 z-50 bg-black/70" onClick={() => setDrawerOpen(false)}><aside onClick={(event) => event.stopPropagation()} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#0b1523] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="rcl-display text-3xl uppercase">Your Bag</h2><button type="button" aria-label="Close bag" onClick={() => setDrawerOpen(false)}><FaXmark /></button></div><div className="mt-8 flex-1 space-y-4 overflow-y-auto">{cart.length === 0 ? <p className="py-20 text-center text-sm text-gray-500">Your bag is empty.</p> : cart.map((line) => <div key={line.product.id} className="flex justify-between gap-4 border-b border-white/10 pb-4"><div><p className="font-bold uppercase">{line.product.name}</p><p className="mt-1 text-sm text-gray-400">{money(line.product.price)} · QTY {line.quantity}</p></div><button type="button" className="text-xs text-rcl-orange" onClick={() => setCart((current) => current.filter((item) => item.product.id !== line.product.id))}>REMOVE</button></div>)}</div><div className="border-t border-white/10 pt-5"><div className="flex justify-between text-sm uppercase"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p className="mt-2 text-xs text-gray-500">Taxes and shipping are calculated at checkout.</p><button type="button" disabled={cart.length === 0} className="rcl-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40">Checkout configuration required</button></div></aside></div>}
    </main>
  );
}
