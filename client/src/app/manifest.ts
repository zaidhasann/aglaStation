import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NextStation',
    short_name: 'NextStation',
    description: 'Delhi Metro shared listening — hear the same song at the same moment with fellow riders.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0f172a',
    background_color: '#020617',
    icons: [
      {
        src: '/icons/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512x512-maskable.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
