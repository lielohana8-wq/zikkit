'use client';
import { useState, useEffect } from 'react';
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

  if (!showAndroid && !showIOS) return null;

  return (
    <Box sx={{
      position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)',
      bgcolor: '#fff', borderRadius: '14px', p: '14px 16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: 1.5,
      zIndex: 200, maxWidth: '92vw', width: 350,
      animation: 'fadeUp 0.3s ease',
      direction: 'rtl',
    }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 8, bgcolor: c.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📲</Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.text }}>התקן את Zikkit</Typography>
        {showIOS ? (
          <Typography sx={{ fontSize: 10, color: c.text3, lineHeight: 1.4 }}>
            לחץ על <Box component="span" sx={{ fontSize: 14 }}>⎋</Box> (שתף) → "הוסף למסך הבית"
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 10, color: c.text3 }}>גישה מהירה מהמסך הראשי</Typography>
        )}
      </Box>
      {showAndroid && (
        <Button variant="contained" size="small" onClick={handleInstall} sx={{ fontSize: 11, px: 2, py: 0.5, minWidth: 'auto' }}>התקן</Button>
      )}
      <IconButton size="small" onClick={dismiss}><Close sx={{ fontSize: 14 }} /></IconButton>
    </Box>
  );
}
