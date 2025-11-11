'use client';

import { useEffect } from 'react';

export default function LegacyEmbeddedConnectRedirect() {
  useEffect(() => {
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const target = `/connect${hash || ''}`;
      window.location.replace(target);
    } catch {}
  }, []);
  return null;
}
