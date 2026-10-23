import { NextResponse } from 'next/server';
export const dynamic = 'force-static';

export function GET() {
  const manifest = {
    id: '/',
    name: 'Rich City Hoops',
    short_name: 'RCH',
    description: 'Virginia basketball connected: social feed, players, open runs, highlights, courts, and Rich City League competition.',
    start_url: '/social?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0b0c0e',
    theme_color: '#0b0c0e',
    categories: ['sports','social','entertainment'],
    shortcuts: [
      { name:'RCH Home', short_name:'Home', description:'Open your basketball social feed.', url:'/social?source=pwa-shortcut', icons:[{src:'/icon?v=black-r-1',sizes:'512x512',type:'image/png'}] },
      { name:'Discover Basketball', short_name:'Discover', description:'Find players, teams and basketball around you.', url:'/discover?source=pwa-shortcut', icons:[{src:'/icon?v=black-r-1',sizes:'512x512',type:'image/png'}] },
      { name:'Open Runs', short_name:'Runs', description:'Find basketball runs across Virginia.', url:'/runs?source=pwa-shortcut', icons:[{src:'/icon?v=black-r-1',sizes:'512x512',type:'image/png'}] },
      { name:'Rich City League', short_name:'League', description:'Open the flagship Rich City League experience.', url:'/league?source=pwa-shortcut', icons:[{src:'/icon?v=black-r-1',sizes:'512x512',type:'image/png'}] },
    ],
    icons: [
      { src:'/favicon.svg?v=black-r-1', sizes:'any', type:'image/svg+xml', purpose:'any' },
      { src:'/icon-192.png', sizes:'192x192', type:'image/png', purpose:'any' },
      { src:'/icon?v=black-r-1', sizes:'512x512', type:'image/png', purpose:'any' },
      { src:'/icon?v=black-r-1', sizes:'512x512', type:'image/png', purpose:'maskable' },
    ],
  };
  return NextResponse.json(manifest, { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } });
}
