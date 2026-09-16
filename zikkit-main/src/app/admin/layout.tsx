'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

const ADMIN_SESSION_KEY = '_zk_admin_auth';

function AdminLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('הכנס אימייל וסיסמה'); return; }
    setLoading(true); setError('');
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      sessionStorage.setItem(ADMIN_SESSION_KEY, Date.now().toString());
      onSuccess();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') setError('סיסמה שגויה');
      else if (code === 'auth/user-not-found') setError('משתמש לא נמצא');
      else setError('שגיאה: ' + (e as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '40px', width: 380, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#4F46E5,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 22, color: '#fff' }}>Z</Typography>
        </Box>
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#1C1917', mb: '4px' }}>Zikkit Admin</Typography>
        <Typography sx={{ fontSize: 12, color: '#A8A29E', mb: '24px' }}>ממשק ניהול</Typography>
        {error && <Box sx={{ bgcolor: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.15)', borderRadius: '10px', p: '8px 14px', mb: '14px', fontSize: 12, color: '#E11D48' }}>{error}</Box>}
        <TextField fullWidth size="small" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ mb: '10px' }} />
        <TextField fullWidth size="small" type="password" placeholder="סיסמה" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ mb: '16px' }} />
        <Button fullWidth variant="contained" onClick={handleLogin} disabled={loading}
          sx={{ fontSize: 14, py: '11px', borderRadius: '10px' }}>
          {loading ? 'מתחבר...' : 'כניסה'}
        </Button>
      </Box>
    </Box>
  );
}

const NAV_ITEMS = [
  { key: 'dashboard', path: '/admin', icon: '📊', label: 'דשבורד' },
  { key: 'clients', path: '/admin/clients', icon: '🏪', label: 'לקוחות' },
  { key: 'add-client', path: '/admin/add-client', icon: '➕', label: 'הוסף לקוח' },
  { key: 'mrr', path: '/admin/mrr', icon: '💵', label: 'MRR' },
  { key: 'agreements', path: '/admin/agreements', icon: '📝', label: 'הסכמים' },
  { key: 'pricing', path: '/admin/pricing', icon: '💰', label: 'מחירון' },
  { key: 'guides', path: '/admin/guides', icon: '📖', label: 'מדריכים' },
  { key: 'changelog', path: '/admin/changelog', icon: '📋', label: 'שינויים' },
  { key: 'launch', path: '/admin/launch', icon: '🚀', label: 'עלייה לאוויר' },
  { key: 'checklist', path: '/admin/checklist', icon: '✅', label: 'צ׳קליסט' },
  { key: 'settings', path: '/admin/settings', icon: '🔑', label: 'API' },
];

function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Box sx={{ width: 220, bgcolor: '#1C1917', borderLeft: '1px solid rgba(255,255,255,0.07)', overflow: 'auto', flexShrink: 0, p: '12px 0' }}>
      <Typography sx={{ p: '8px 16px 8px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        ניהול
      </Typography>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path;
        return (
          <Box key={item.key} onClick={() => router.push(item.path)}
            sx={{
              display: 'flex', alignItems: 'center', gap: '10px',
              p: '8px 14px', cursor: 'pointer', fontSize: 12.5,
              color: active ? '#fff' : 'rgba(255,255,255,0.5)',
              bgcolor: active ? 'rgba(99,102,241,0.18)' : 'transparent',
              borderRadius: '8px', mx: '6px', my: '1px', transition: 'all 0.15s',
              '&:hover': { bgcolor: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.06)', color: '#fff' },
            }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </Box>
        );
      })}
    </Box>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const adminSession = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (adminSession) {
      const auth = getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) { setAuthed(true); setEmail(user.email || ''); }
        setChecking(false);
      });
      return unsub;
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthed(false);
  };

  if (checking) {
    return <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><CircularProgress sx={{ color: '#4F46E5' }} /></Box>;
  }
  if (!authed) {
    return <AdminLoginScreen onSuccess={() => { setAuthed(true); setEmail(getFirebaseAuth().currentUser?.email || ''); }} />;
  }

  return (
    <Box sx={{ height: '100vh', direction: 'rtl', overflow: 'hidden' }}>
      {/* Topbar */}
      <Box sx={{ height: 52, bgcolor: '#1C1917', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', px: '20px', gap: '12px' }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#6366F1,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontWeight: 900, fontSize: 13, color: '#fff' }}>Z</Typography>
        </Box>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Zikkit Admin</Typography>
        <Box sx={{ bgcolor: 'rgba(99,102,241,0.15)', borderRadius: '6px', p: '2px 10px', fontSize: 10, color: '#818CF8', fontWeight: 600 }}>HQ</Box>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{email}</Typography>
        <Button onClick={handleLogout} size="small"
          sx={{ bgcolor: 'rgba(225,29,72,0.1)', color: '#E11D48', borderRadius: '8px', p: '4px 14px', fontSize: 11, fontWeight: 600, '&:hover': { bgcolor: '#E11D48', color: '#fff' } }}>
          יציאה
        </Button>
      </Box>
      {/* Body */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
        <AdminSidebar />
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#F5F0EB', p: '24px' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
