import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Rich City League',
    short_name: 'RCL',
    description: 'Richmond basketball, live Game Night, player Passports, REP, runs, training, fantasy, media and community.',
    start_url: '/today?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#03070D',
    theme_color: '#03070D',
    categories: ['sports', 'social', 'entertainment'],
    shortcuts: [
      { name: 'Today in RCL', short_name: 'Today', description: 'Open your RCL basketball command center.', url: '/today?source=pwa-shortcut', icons: [{ src: '/icons/rcl-app-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Game Night', short_name: 'Games', description: 'Open live and upcoming Rich City League games.', url: '/games?source=pwa-shortcut', icons: [{ src: '/icons/rcl-app-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Open Runs', short_name: 'Runs', description: 'Find basketball runs and courts around Richmond.', url: '/runs?source=pwa-shortcut', icons: [{ src: '/icons/rcl-app-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'RCL Social', short_name: 'Social', description: 'Open the RCL basketball social network.', url: '/social?source=pwa-shortcut', icons: [{ src: '/icons/rcl-app-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/rcl-app-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    ],
  };
}
