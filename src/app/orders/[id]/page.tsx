'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaBoxOpen, FaCheck, FaTruck } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Order = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string | null;
  shipping_address: Record<string, unknown> | null;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  payment_status: string;
  fulfillment_status: string;
  tracking_number: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_snapshot: Record<string, unknown>;
  variant_snapshot: Record<string, unknown> | null;
  quantity: number;
  unit_price: number;
};

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) { setLoading(false); return; }

    let active = true;
    void (async () => {
      const { id } = await params;
      const [orderResult, itemsResult] = await Promise.all([
        supabase.from('orders').select('id,order_number,customer_email,customer_name,shipping_address,subtotal,shipping,tax,total,payment_status,fulfillment_status,tracking_number,created_at').eq('id', id).maybeSingle(),
        supabase.from('order_items').select('id,product_snapshot,variant_snapshot,quantity,unit_price').eq('order_id', id).order('created_at', { ascending: true }),
      ]);
      if (!active) return;
      if (orderResult.error) setError(orderResult.error.message);
      else setOrder((orderResult.data || null) as Order | null);
      if (!itemsResult.error) setItems((itemsResult.data || []) as unknown as OrderItem[]);
      setLoading(false);
    })();

    return () => { active = false; };
  }, [authLoading, supabase, user, params]);

  if (authLoading || loading) return <main className="min-h-screen bg-rcl-black p-20 text-center text-gray-400">Loading order…</main>;

  if (!user) return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <Container maxWidth="lg" className="py-16 text-center">
        <FaBoxOpen className="mx-auto text-5xl text-rcl-orange" />
        <h1 className="mt-5 font-display text-3xl uppercase">Sign in to view this order</h1>
        <Link href="/auth/sign-in?redirect=/orders" className="rcl-button mt-6 inline-flex">Sign in</Link>
      </Container>
    </main>
  );

  if (error || !order) return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <Container maxWidth="lg" className="py-16 text-center">
        <p className="rcl-kicker">RCL SHOP</p>
        <h1 className="mt-3 font-display text-4xl uppercase">Order not found</h1>
        <p className="mt-3 text-sm text-gray-500">{error || 'This order is unavailable or you do not have access to it.'}</p>
        <Link href="/orders" className="rcl-link mt-6 inline-flex items-center gap-2"><FaArrowLeft /> My orders</Link>
      </Container>
    </main>
  );

  const address = order.shipping_address || {};
  const addressLines = [address.name, address.address1, address.address2, [address.city, address.state, address.postal_code].filter(Boolean).join(', ')].filter(Boolean);

  return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <Container maxWidth="lg" className="py-10 sm:py-16">
        <Link href="/orders" className="rcl-link inline-flex items-center gap-2"><FaArrowLeft /> My orders</Link>
        <header className="mt-8 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="rcl-kicker">RCL SHOP · ORDER</p>
            <h1 className="rcl-display mt-2 text-5xl uppercase">{order.order_number}</h1>
            <p className="mt-3 text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full bg-rcl-gold/10 px-3 py-2 text-rcl-gold">Payment · {order.payment_status}</span>
            <span className="rounded-full bg-rcl-orange/10 px-3 py-2 text-rcl-orange">Fulfillment · {order.fulfillment_status}</span>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-7">
            <h2 className="font-display text-2xl uppercase">Items</h2>
            <div className="mt-5 divide-y divide-white/10">
              {items.length ? items.map((item) => {
                const name = typeof item.product_snapshot?.name === 'string' ? item.product_snapshot.name : 'RCL product';
                const variant = typeof item.variant_snapshot?.name === 'string' ? item.variant_snapshot.name : null;
                return <div key={item.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-bold uppercase">{name}</p>{variant && <p className="mt-1 text-xs text-gray-500">{variant}</p>}<p className="mt-1 text-xs text-gray-500">Qty {item.quantity}</p></div><strong>{money(item.unit_price * item.quantity)}</strong></div>;
              }) : <p className="py-8 text-sm text-gray-500">No line items were recorded for this order.</p>}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-7">
              <h2 className="font-display text-2xl uppercase">Summary</h2>
              <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{money(order.subtotal)}</span></div><div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{money(order.shipping)}</span></div><div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{money(order.tax)}</span></div><div className="flex justify-between border-t border-white/10 pt-3 font-black"><span>Total</span><span className="text-rcl-orange">{money(order.total)}</span></div></div>
            </section>
            <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-7">
              <h2 className="font-display text-2xl uppercase">Delivery</h2>
              {order.tracking_number ? <p className="mt-4 flex items-center gap-2 text-sm"><FaTruck className="text-rcl-orange" /> Tracking: {order.tracking_number}</p> : <p className="mt-4 flex items-center gap-2 text-sm text-gray-500"><FaCheck className="text-rcl-gold" /> Tracking will appear when your order ships.</p>}
              {addressLines.length > 0 && <div className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-gray-400">{addressLines.map((line, index) => <p key={index}>{String(line)}</p>)}</div>}
            </section>
          </aside>
        </div>
      </Container>
    </main>
  );
}
