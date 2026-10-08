'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBoxOpen } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Order = { id: string; order_number: string; total: number; payment_status: string; fulfillment_status: string; created_at: string };
export default function OrdersPage() {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => { if (!supabase || !user) return; void (async () => { const { data } = await supabase.from('orders').select('id,order_number,total,payment_status,fulfillment_status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }); setOrders((data || []) as Order[]); })(); }, [supabase, user]);
  if (loading) return <main className="min-h-screen bg-rcl-black p-20 text-center text-gray-400">Loading orders…</main>;
  if (!user) return <main className="min-h-screen bg-rcl-black p-20 text-center text-white"><h1 className="font-display text-3xl uppercase">Sign in to view orders</h1><Link href="/auth/sign-in" className="rcl-link mt-5">Sign in <FaArrowRight /></Link></main>;
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="lg" className="py-16"><p className="rcl-kicker">YOUR RCL ACCOUNT</p><h1 className="rcl-display mt-3 text-6xl uppercase">My Orders</h1>{orders.length ? <div className="mt-10 space-y-3">{orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="rcl-editorial flex items-center justify-between rounded-2xl p-5 hover:border-rcl-orange"><div><p className="font-bold">{order.order_number}</p><p className="mt-1 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()} · {order.payment_status} · {order.fulfillment_status}</p></div><strong>${(order.total / 100).toFixed(2)}</strong></Link>)}</div> : <div className="rcl-editorial mt-10 rounded-3xl p-12 text-center"><FaBoxOpen className="mx-auto text-4xl text-rcl-orange" /><h2 className="mt-4 font-display text-2xl uppercase">No orders yet</h2><Link href="/shop" className="rcl-link mt-5">Shop the collection <FaArrowRight /></Link></div>}</Container></main>;
}
