'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { zikkitColors as c } from '@/styles/theme';

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const d = localStorage.getItem('zk-pwa-dismiss');
      if (!d || Date.now() - Number(d) > 7 * 86400000) {
        setShow(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('zk-pwa-dismiss', String(Date.now()));
  };

  if (!show || dismissed) return null;

  return (
    <Box sx={{
      position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
      bgcolor: '#fff', borderRadius: '14px', p: '14px 18px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 2,
      zIndex: 200, maxWidth: '90vw', width: 360,
      animation: 'fadeUp 0.3s ease',
    }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 8, bgcolor: c.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Typography sx={{ fontSize: 18 }}>📲</Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: c.text }}>התקן את Zikkit</Typography>
        <Typography sx={{ fontSize: 11, color: c.text3 }}>גישה מהירה מהמסך הראשי</Typography>
      </Box>
      <Button variant="contained" size="small" onClick={handleInstall} sx={{ fontSize: 11, px: 2, py: 0.5 }}>
        התקן
      </Button>
      <IconButton size="small" onClick={handleDismiss}><Close sx={{ fontSize: 16 }} /></IconButton>
    </Box>
  );
}
