'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '@/lib/constants';

interface UseIdleTimeoutOptions {
  onTimeout: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({ onTimeout, onWarning, enabled = true }: UseIdleTimeoutOptions) {
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState('5:00');

  const resetIdle = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handler = () => {
      lastActivityRef.current = Date.now();
    };

    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;

      if (idle >= IDLE_TIMEOUT_MS) {
        clearInterval(interval);
        onTimeout();
        return;
      }

      if (idle >= IDLE_WARNING_MS) {
        const secsLeft = Math.ceil((IDLE_TIMEOUT_MS - idle) / 1000);
        const m = Math.floor(secsLeft / 60);
        const s = secsLeft % 60;
        setCountdown(`${m}:${s < 10 ? '0' : ''}${s}`);
        setShowWarning(true);
        onWarning?.();
      } else {
        setShowWarning(false);
      }
    }, 10000);

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      clearInterval(interval);
    };
  }, [enabled, onTimeout, onWarning]);

  return { showWarning, countdown, resetIdle };
}
