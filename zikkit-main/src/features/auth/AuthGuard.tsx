'use client';
import { IS_SOLO_EDITION } from '@/lib/region';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useAuth } from './AuthProvider';
import { ForcePasswordChange } from './ForcePasswordChange';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string[];
}

function EmailVerificationGate({ onVerified }: { onVerified: () => void }) {
  const { firebaseUser, logout } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  const resend = async () => {
    if (!firebaseUser || sending) return;
    setSending(true);
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(firebaseUser);
      setSent(true);
    } catch {}
    setSending(false);
  };

  const checkNow = async () => {
    if (!firebaseUser) return;
    setChecking(true);
    try {
      await firebaseUser.reload();
      if (firebaseUser.emailVerified) {
        onVerified();
      }
    } catch {}
    setChecking(false);
  };

  // Auto-check every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (firebaseUser) {
        try {
          await firebaseUser.reload();
          if (firebaseUser.emailVerified) {
            onVerified();
          }
        } catch {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [firebaseUser, onVerified]);

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #07090b 0%, #0a1015 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Box sx={{ maxWidth: 460, mx: 'auto', textAlign: 'center', p: '40px 24px' }}>
        <Box sx={{ fontSize: 64, mb: 2 }}>📧</Box>
        <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#fff', mb: 1, fontFamily: "'Syne', sans-serif" }}>
          {IS_SOLO_EDITION ? 'Verify your email' : 'אמת את כתובת המייל'}
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#5a7080', mb: 3, lineHeight: 1.8 }}>
          {IS_SOLO_EDITION ? 'We sent a verification email to:' : 'שלחנו לך מייל אימות ל:'}
        </Typography>
        <Box sx={{
          bgcolor: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)',
          borderRadius: '12px', p: '14px 20px', mb: 3,
        }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#00e5b0', direction: 'ltr' }}>
            {firebaseUser?.email}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13, color: '#5a7080', mb: 3, lineHeight: 1.7 }}>
          {IS_SOLO_EDITION ? 'Click the link in the email to activate your account.' : 'לחץ על הקישור במייל כדי להפעיל את החשבון.'}<br />
          {IS_SOLO_EDITION ? "Can't find it? " : 'לא מצאת? '}<strong style={{ color: '#f59e0b' }}>{IS_SOLO_EDITION ? 'Check your spam folder.' : 'בדוק בתיקיית הספאם.'}</strong>
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button fullWidth variant="contained" onClick={checkNow} disabled={checking}
            sx={{ p: '12px', fontSize: 14, fontWeight: 800, borderRadius: '10px' }}>
            {checking ? (IS_SOLO_EDITION ? '⏳ Checking…' : '⏳ בודק...') : (IS_SOLO_EDITION ? '✅ I verified — check now' : '✅ אימתתי — תבדוק עכשיו')}
          </Button>
          <Button fullWidth onClick={resend} disabled={sending || sent}
            sx={{
              p: '10px', fontSize: 12, fontWeight: 600, borderRadius: '10px', color: sent ? '#22c55e' : '#4f8fff',
              bgcolor: sent ? 'rgba(34,197,94,0.08)' : 'rgba(79,143,255,0.08)',
              border: '1px solid ' + (sent ? 'rgba(34,197,94,0.2)' : 'rgba(79,143,255,0.2)'),
            }}>
            {sent ? (IS_SOLO_EDITION ? '✅ Sent!' : '✅ נשלח בהצלחה!') : sending ? (IS_SOLO_EDITION ? 'Sending…' : '...שולח') : (IS_SOLO_EDITION ? '📧 Resend verification email' : '📧 שלח מייל אימות שוב')}
          </Button>
          <Button fullWidth onClick={logout}
            sx={{ p: '8px', fontSize: 11, color: '#5a7080', '&:hover': { color: '#ff4d6d' } }}>
            {IS_SOLO_EDITION ? '🚪 Sign out' : '🚪 יציאה'}
          </Button>
        </Box>

        <Box sx={{
          mt: 3, bgcolor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: '10px', p: '12px 16px', textAlign: 'right',
        }}>
          <Typography sx={{ fontSize: 11, color: '#f59e0b', lineHeight: 1.7 }}>
            💡 <strong>{IS_SOLO_EDITION ? 'Tip:' : 'טיפ:'}</strong> {IS_SOLO_EDITION ? 'If the email landed in spam, mark it "not spam" so future emails reach your inbox.' : 'אם המייל בספאם, סמן אותו כ"לא ספאם" כדי שמיילים עתידיים יגיעו לתיבה הראשית.'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, firebaseUser, loading, mustChangePassword } = useAuth();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    if (!loading && user && requiredRole && !requiredRole.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, requiredRole]);

  // Check initial verification state
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      setEmailVerified(true);
    }
  }, [firebaseUser]);

  if (loading) {
    return (
      <Box sx={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#07090b',
      }}>
        <CircularProgress sx={{ color: '#00e5b0' }} />
      </Box>
    );
  }

  if (!user) return null;

  // Force password change for first-time login
  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  // Block until email is verified (only for owners who registered. Techs/super_admin exempt.)
  if (firebaseUser && !firebaseUser.emailVerified && !emailVerified && user.role === 'owner') {
    return <EmailVerificationGate onVerified={() => setEmailVerified(true)} />;
  }

  return <>{children}</>;
}
