import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'RCL Basketball Social',
    short_name: 'RCL',
    description: 'Richmond basketball connected: social feed, players, runs, highlights, discovery and Rich City League competition.',
    start_url: '/social?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F7F5F1',
    theme_color: '#F7F5F1',
    categories: ['sports','social','entertainment'],
    shortcuts: [
      { name:'RCL Home', short_name:'Home', description:'Open your basketball social feed.', url:'/social?source=pwa-shortcut', icons:[{src:'/icon',sizes:'512x512',type:'image/png'}] },
      { name:'Discover Basketball', short_name:'Discover', description:'Find players, teams and basketball around you.', url:'/discover?source=pwa-shortcut', icons:[{src:'/icon',sizes:'512x512',type:'image/png'}] },
      { name:'Open Runs', short_name:'Runs', description:'Find basketball runs around Richmond.', url:'/runs?source=pwa-shortcut', icons:[{src:'/icon',sizes:'512x512',type:'image/png'}] },
      { name:'Rich City League', short_name:'League', description:'Open the flagship Rich City League experience.', url:'/league?source=pwa-shortcut', icons:[{src:'/icon',sizes:'512x512',type:'image/png'}] },
    ],
    icons: [
      { src:'/favicon.svg', sizes:'any', type:'image/svg+xml', purpose:'any' },
      { src:'/icon', sizes:'512x512', type:'image/png', purpose:'any' },
      { src:'/icon', sizes:'512x512', type:'image/png', purpose:'maskable' },
    ],
  };
}
