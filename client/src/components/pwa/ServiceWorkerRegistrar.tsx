'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount.
 * Rendered once inside the root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Service worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Service worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
