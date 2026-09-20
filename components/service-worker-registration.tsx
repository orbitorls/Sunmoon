'use client';

import { useEffect, useState } from 'react';
import { swManager } from '@/lib/sw-registration';

export function ServiceWorkerRegistration() {
  const [swStatus, setSwStatus] = useState<'idle' | 'registering' | 'active' | 'failed'>('registering');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const register = async () => {
      const registration = await swManager.register();
      setSwStatus(registration ? 'active' : 'failed');
    };

    const timeoutId = setTimeout(register, 1000);

    const unsubscribe = swManager.subscribe((state) => {
      if (state.active) {
        setSwStatus('active');
      } else if (state.registered || state.installing) {
        setSwStatus('registering');
      } else if (state.error) {
        setSwStatus('failed');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Sync IndexedDB when service worker is active
  useEffect(() => {
    if (typeof window === 'undefined' || swStatus !== 'active') return;

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
