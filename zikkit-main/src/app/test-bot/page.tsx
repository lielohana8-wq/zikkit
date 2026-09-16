'use client';
import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';

export default function TestBotPage() {
  const [phone, setPhone] = useState('+972');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const call = async () => {
    setLoading(true); setStatus('מתקשר אליך...');
    try {
      const res = await fetch('/api/test-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (data.success) setStatus('📞 הטלפון שלך אמור לצלצל עכשיו! תענה.');
      else setStatus('❌ ' + (data.error || 'Unknown'));
    } catch { setStatus('❌ שגיאת רשת'); }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Box sx={{ bgcolor: '#fff', borderRadius: '20px', p: 4, maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <Typography sx={{ fontSize: 40, mb: 1 }}>🤖</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 800, mb: '4px' }}>בדיקת בוט AI</Typography>
        <Typography sx={{ fontSize: 13, color: '#78716C', mb: 3 }}>הכנס מספר טלפון — הבוט יתקשר אליך</Typography>
        <TextField fullWidth value={phone} onChange={e => setPhone(e.target.value)} placeholder="+972501234567" dir="ltr"
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: 18, textAlign: 'center' } }} />
        <Button fullWidth variant="contained" onClick={call} disabled={loading || phone.length < 10}
          sx={{ borderRadius: '12px', py: 1.5, fontSize: 16, fontWeight: 700, mb: 2 }}>
          {loading ? '⏳ מתקשר...' : '📞 תתקשר אליי'}
        </Button>
        {status && (
          <Box sx={{ p: 2, borderRadius: '10px', bgcolor: status.includes('❌') ? '#FEF2F2' : '#ECFDF5', fontSize: 14, fontWeight: 600,
            color: status.includes('❌') ? '#DC2626' : '#059669' }}>{status}</Box>
        )}
        <Typography sx={{ fontSize: 11, color: '#A8A29E', mt: 3 }}>הבוט יתקשר מ-+18204446549</Typography>
      </Box>
    </Box>
  );
}
