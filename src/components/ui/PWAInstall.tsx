'use client';
import { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { zikkitColors as c } from '@/styles/theme';

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const d = localStorage.getItem('zk-pwa-dismiss');
      if (!d || Date.now() - Number(d) > 7 * 86400000) setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <Box sx={{
      position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
      bgcolor: '#fff', borderRadius: '14px', p: '12px 16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: 1.5,
      zIndex: 200, maxWidth: '90vw', width: 340,
    }}>
      <Box sx={{ width: 32, height: 32, borderRadius: 8, bgcolor: c.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>📲</Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.text }}>התקן את Zikkit</Typography>
        <Typography sx={{ fontSize: 10, color: c.text3 }}>גישה מהירה מהמסך הראשי</Typography>
      </Box>
      <Button variant="contained" size="small" onClick={handleInstall} sx={{ fontSize: 11, px: 2, py: 0.5, minWidth: 'auto' }}>התקן</Button>
      <IconButton size="small" onClick={() => { setShow(false); localStorage.setItem('zk-pwa-dismiss', String(Date.now())); }}><Close sx={{ fontSize: 14 }} /></IconButton>
    </Box>
  );
}
