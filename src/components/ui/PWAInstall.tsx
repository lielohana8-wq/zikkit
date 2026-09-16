'use client';
import { IS_SOLO_EDITION } from '@/lib/region';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';

/** Public, customer-facing routes — the install prompt must never appear there. */
const PUBLIC_PREFIXES = ['/q/', '/r/', '/join/', '/quote/', '/receipt/', '/portal/', '/embed/', '/login', '/register', '/pricing', '/privacy', '/terms', '/subscription'];
import { Box, Button, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { zikkitColors as c } from '@/styles/theme';

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function PWAInstall() {
  const pathname = usePathname() || '';
  const { user } = useAuth();
  const isPublic = pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const hidden = isPublic || !user;
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Register SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Already installed as PWA
    if (isStandalone()) return;

    const dismissed = localStorage.getItem('zk-pwa-dismiss');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return;

    // Android: listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show manual instructions
    if (isIOS()) {
      setTimeout(() => setShowIOS(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShowAndroid(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    localStorage.setItem('zk-pwa-dismiss', String(Date.now()));
  };

  if (hidden || (!showAndroid && !showIOS)) return null;

  return (
    <Box sx={{
      position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)',
      bgcolor: '#fff', borderRadius: '14px', p: '14px 16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: 1.5,
      zIndex: 200, maxWidth: '92vw', width: 350,
      animation: 'fadeUp 0.3s ease',
      direction: IS_SOLO_EDITION ? 'ltr' : 'rtl',
    }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 8, bgcolor: c.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📲</Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.text }}>{IS_SOLO_EDITION ? 'Add Zikkit to your home screen' : 'התקן את Zikkit'}</Typography>
        {showIOS ? (
          <Typography sx={{ fontSize: 10, color: c.text3, lineHeight: 1.4 }}>
            {IS_SOLO_EDITION ? <>Tap <Box component="span" sx={{ fontSize: 14 }}>⎋</Box> (Share) → "Add to Home Screen"</> : <>לחץ על <Box component="span" sx={{ fontSize: 14 }}>⎋</Box> (שתף) → "הוסף למסך הבית"</>}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 10, color: c.text3 }}>גישה מהירה מהמסך הראשי</Typography>
        )}
      </Box>
      {showAndroid && (
        <Button variant="contained" size="small" onClick={handleInstall} sx={{ fontSize: 11, px: 2, py: 0.5, minWidth: 'auto' }}>{IS_SOLO_EDITION ? 'Install' : 'התקן'}</Button>
      )}
      <IconButton size="small" onClick={dismiss}><Close sx={{ fontSize: 14 }} /></IconButton>
    </Box>
  );
}
