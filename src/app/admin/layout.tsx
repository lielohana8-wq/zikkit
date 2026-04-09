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
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#07090c', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <Box sx={{ bgcolor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', p: '40px', width: 360, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <Typography sx={{ fontSize: 24, fontWeight: 900, background: 'linear-gradient(135deg, #3fb950, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: '4px' }}>⚡ ZIKKIT</Typography>
        <Typography sx={{ fontSize: 11, color: '#484f58', fontFamily: 'monospace', mb: '28px' }}>OWNER CONSOLE · v77</Typography>
        {error && <Box sx={{ bgcolor: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: '8px', p: '8px 14px', mb: '14px', fontSize: 12, color: '#f85149' }}>{error}</Box>}
        <TextField fullWidth size="small" placeholder={"אימייל"} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ mb: '10px', '& .MuiOutlinedInput-root': { bgcolor: '#161b22', borderRadius: '8px', '& fieldset': { borderColor: '#30363d' }, '&.Mui-focused fieldset': { borderColor: '#3fb950' } }, '& .MuiInputBase-input': { color: '#e6edf3', p: '10px 14px' } }} />
        <TextField fullWidth size="small" type="password" placeholder={"סיסמה"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ mb: '14px', '& .MuiOutlinedInput-root': { bgcolor: '#161b22', borderRadius: '8px', '& fieldset': { borderColor: '#30363d' }, '&.Mui-focused fieldset': { borderColor: '#3fb950' } }, '& .MuiInputBase-input': { color: '#e6edf3', p: '10px 14px' } }} />
        <Button fullWidth onClick={handleLogin} disabled={loading}
          sx={{ bgcolor: '#238636', color: '#fff', fontWeight: 700, fontSize: 14, p: '11px', borderRadius: '8px', '&:hover': { bgcolor: '#3fb950' } }}>
          {loading ? 'מתחבר...' : 'כניסה לממשק ניהול'}
        </Button>
      </Box>
    </Box>
  );
}

const NAV_ITEMS = [
  { key: 'dashboard', path: '/admin', icon: '📊', label: 'דשבורד' },
  { key: 'clients', path: '/admin/clients', icon: '🏪', label: 'לקוחות' },
  { key: 'add-client', path: '/admin/add-client', icon: '➕', label: 'הוסף לקוח' },
  { key: 'agreements', path: '/admin/agreements', icon: '📝', label: 'הסכמים' },
  { key: 'pricing', path: '/admin/pricing', icon: '💰', label: 'מחירון' },
  { key: 'guides', path: '/admin/guides', icon: '📖', label: 'מדריכים' },
  { key: 'changelog', path: '/admin/changelog', icon: '📋', label: 'Changelog' },
  { key: 'launch', path: '/admin/launch', icon: '🚀', label: 'עלייה לאוויר' },
  { key: 'checklist', path: '/admin/checklist', icon: '✅', label: 'צ׳קליסט' },
  { key: 'settings', path: '/admin/settings', icon: '🔑', label: 'מפתחות API' },
];

function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Box sx={{ width: 240, bgcolor: '#0d1117', borderLeft: '1px solid #21262d', overflow: 'auto', flexShrink: 0, p: '12px 0' }}>
      <Typography sx={{ p: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: '#484f58', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'monospace' }}>
        ניהול
      </Typography>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path;
        return (
          <Box key={item.key} onClick={() => router.push(item.path)}
            sx={{
              display: 'flex', alignItems: 'center', gap: '10px',
              p: '8px 16px', cursor: 'pointer', fontSize: 13,
              color: active ? '#3fb950' : '#8b949e',
              bgcolor: active ? 'rgba(63,185,80,0.1)' : 'transparent',
              borderRadius: '6px', mx: '8px', my: '1px', transition: 'all 0.15s',
              '&:hover': { bgcolor: '#161b22', color: '#e6edf3' },
            }}>
            <span>{item.icon}</span>
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
    return <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#07090c' }}><CircularProgress sx={{ color: '#3fb950' }} /></Box>;
  }
  if (!authed) {
    return <AdminLoginScreen onSuccess={() => { setAuthed(true); setEmail(getFirebaseAuth().currentUser?.email || ''); }} />;
  }

  return (
    <Box sx={{ height: '100vh', direction: 'rtl', overflow: 'hidden' }}>
      {/* Topbar */}
      <Box sx={{ height: 52, bgcolor: '#0d1117', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', px: '20px', gap: '16px' }}>
        <Typography sx={{ fontSize: 18, fontWeight: 900, background: 'linear-gradient(135deg, #3fb950, #58a6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚡ ZIKKIT</Typography>
        <Box sx={{ bgcolor: '#161b22', border: '1px solid #30363d', borderRadius: '4px', p: '2px 8px', fontSize: 10, color: '#3fb950', fontFamily: 'monospace' }}>OPERATIONS HQ</Box>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 11, color: '#484f58', fontFamily: 'monospace' }}>{email}</Typography>
        <Button onClick={handleLogout} size="small"
          sx={{ bgcolor: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', color: '#f85149', borderRadius: '6px', p: '4px 12px', fontSize: 11, fontFamily: 'monospace', '&:hover': { bgcolor: '#f85149', color: '#fff' } }}>
          יציאה ↪
        </Button>
      </Box>
      {/* Body */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
        <AdminSidebar />
        <Box sx={{ flex: 1, overflow: 'auto', p: '24px' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
