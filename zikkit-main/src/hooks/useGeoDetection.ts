'use client';

import { useState, useEffect } from 'react';
import { PLANS } from '@/lib/constants';

type Country = 'us' | 'il';

export function useGeoDetection() {
  const [country, setCountry] = useState<Country>('us');
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const detect = async () => {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
        const data = await res.json();
        setCountry(data.country_code === 'IL' ? 'il' : 'us');
      } catch {
        const lang = navigator.language || '';
        setCountry(lang.includes('he') ? 'il' : 'us');
      } finally {
        setDetected(true);
      }
    };
    detect();
  }, []);

  const plans = PLANS[country] || PLANS.us;
  const isIL = country === 'il';

  return { country, plans, isIL, detected };
}
