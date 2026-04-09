'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SPS SW registered: ', registration);
          },
          (err) => {
            console.log('SPS SW registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return null;
}
