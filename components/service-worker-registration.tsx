'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegistration() {
  const [swStatus, setSwStatus] = useState<'idle' | 'registering' | 'active' | 'failed'>('idle');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Online/offline status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker
    const registerServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) {
        console.warn('[SW] Service Worker not supported in this browser');
        setSwStatus('failed');
        return;
      }

      setSwStatus('registering');

      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[SW] Service Worker registered successfully:', registration.scope);
        setSwStatus('active');

        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('[SW] New Service Worker version found');
        });

        // Handle new service worker activation
        let refreshing = false;
        registration.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          console.log('[SW] Controller changed, reloading page');
          window.location.reload();
        });

      } catch (error) {
        console.error('[SW] Service Worker registration failed:', error);
        setSwStatus('failed');
      }
    };

    // Register Service Worker after a short delay to ensure page load is complete
    const timeoutId = setTimeout(registerServiceWorker, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timeoutId);
    };
  }, []);

    // Sync IndexedDB on mount
  useEffect(() => {
    if (typeof window === 'undefined' || swStatus !== 'active') return;

    // Initialize IndexedDB when SW is ready
    const initIndexedDB = async () => {
      try {
        const { indexedDB } = await import('@/lib/indexed-db');
        await indexedDB.init();
        console.log('[SW] IndexedDB initialized successfully');
      } catch (error) {
        console.error('[SW] Failed to initialize IndexedDB:', error);
      }
    };

    initIndexedDB();
  }, [swStatus]);

  // Don't render anything - this is purely for side effects
  return null;
}
