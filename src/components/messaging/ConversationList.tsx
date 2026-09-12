'use client';

import Link from 'next/link';
import { FiMessageCircle } from 'react-icons/fi';

export type ConversationListItem = {
  id: string;
  title: string;
  type: string;
  preview: string;
  updatedAt: string;
  unread: number;
  avatarUrl: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationRow({ item }: { item: ConversationListItem }) {
  return (
    <Link
      href={`/messages/${item.id}`}
      className="group flex min-h-[84px] items-center gap-3 border-b border-white/[0.07] px-4 py-4 transition hover:bg-white/[0.05] focus-visible:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rcl-gold"
      aria-label={`Open conversation with ${item.title}${item.unread ? `, ${item.unread} unread` : ''}`}
    >
      <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-rcl-navy text-sm font-black text-rcl-gold">
        {item.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          item.title.slice(0, 2).toUpperCase()
        )}
        {item.unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-rcl-black bg-rcl-gold" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className={`truncate text-sm ${item.unread ? 'font-black text-white' : 'font-bold text-gray-200'}`}>{item.title}</h3>
          <time className={`shrink-0 text-[10px] ${item.unread ? 'font-bold text-rcl-gold' : 'text-gray-500'}`} dateTime={item.updatedAt}>
            {formatDate(item.updatedAt)}
          </time>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className={`truncate text-xs ${item.unread ? 'font-semibold text-gray-200' : 'text-gray-500'}`}>{item.preview || 'No messages yet'}</p>
          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-gray-600">{item.type}</span>
        </div>
      </div>
    </Link>
  );
}

export function ConversationList({ items, emptyMessage = 'No conversations match this view.' }: { items: ConversationListItem[]; emptyMessage?: string }) {
  if (!items.length) {
    return (
      <div className="grid min-h-[220px] place-items-center p-8 text-center">
        <div>
          <FiMessageCircle className="mx-auto h-8 w-8 text-rcl-gold/50" aria-hidden="true" />
          <p className="mt-3 text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  return <div>{items.map((item) => <ConversationRow key={item.id} item={item} />)}</div>;
}
