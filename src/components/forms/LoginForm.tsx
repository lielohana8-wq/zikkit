'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { getDefaultRoute } from '@/lib/permissions';
import { zikkitColors as c } from '@/styles/theme';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const { login, loading, error, clearError, user, sendPasswordReset } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();

  // Redirect if already logged in — in useEffect, not during render
  useEffect(() => {
    if (user) {
      router.replace(getDefaultRoute(user.role));
    }
  }, [user, router]);

  const handleSubmit = async () => {
    clearError();
    if (!email.trim() || !password) return;
    await login(email, password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotError(t('enter_email')); return; }
    setForgotError('');
    try {
      await sendPasswordReset(forgotEmail);
      setForgotSent(true);
    } catch (e) {
      setForgotError((e as Error).message);
    }
  };

  // Don't render form if already logged in
  if (user) return null;

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: c.bg,
        backgroundImage: [
          'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0,229,176,0.06) 0%, transparent 55%)',
          'radial-gradient(ellipse 50% 40% at 85% 85%, rgba(79,143,255,0.04) 0%, transparent 50%)',
          'radial-gradient(ellipse 40% 30% at 10% 70%, rgba(167,139,250,0.03) 0%, transparent 50%)',
        ].join(','),
        '&::before': {
          content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.008) 40px,rgba(255,255,255,0.008) 41px),' +
            'repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.008) 40px,rgba(255,255,255,0.008) 41px)',
        },
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(145deg, rgba(15,19,24,0.95), rgba(11,14,18,0.98))',
          border: '1px solid ' + c.border2, borderRadius: '24px', p: '38px',
          width: 408, maxWidth: '96vw',
          animation: 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 0 0 1px ' + c.border + ', 0 40px 100px rgba(0,0,0,0.7), 0 0 80px -20px ' + c.accentGlow,
          position: 'relative', overflow: 'hidden', backdropFilter: 'blur(40px)',
          '&::before': {
            content: '""', position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(90deg, transparent, ' + c.accent + ', transparent)', opacity: 0.6,
          },
        }}
      >
        {/* Language selector */}
        <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'center', mb: '22px' }}>
          {(['en', 'es', 'he'] as const).map((l) => (
            <Button key={l} size="small" onClick={() => setLang(l)}
              sx={{
                px: '14px', py: '5px', borderRadius: '8px', fontSize: 11, fontWeight: 600, minWidth: 'auto',
                border: '1px solid ' + (lang === l ? 'rgba(79,70,229,0.25)' : c.border2),
                bgcolor: lang === l ? c.accentDim : 'transparent',
                color: lang === l ? c.accent : c.text3,
                '&:hover': lang !== l ? { bgcolor: c.glass2, color: c.text2 } : {},
              }}
            >
              {l === 'en' ? 'EN' : l === 'es' ? 'ES' : 'עב'}
            </Button>
          ))}
        </Box>

        {/* Logo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', mb: '8px' }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, ' + c.accent + ', ' + c.accent2 + ')',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#000',
            boxShadow: '0 8px 28px ' + c.accentGlow + ', 0 0 0 1px rgba(0,229,176,0.25)',
          }}>Zk</Box>
          <Typography sx={{
            fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800,
            color: c.text, letterSpacing: '-1px', textAlign: 'center', lineHeight: 1.1,
          }}>Zikkit</Typography>
        </Box>

        <Typography sx={{ fontSize: 12, color: c.text3, textAlign: 'center', mb: '26px', mt: '2px' }}>
          {t('subtitle') || 'Field Service Management Platform'}
        </Typography>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{
            mb: '14px', bgcolor: c.hotDim, border: '1px solid rgba(255,77,109,0.25)',
            borderRadius: '10px', fontSize: 12, color: c.hot, animation: 'fadeIn 0.2s ease',
            '& .MuiAlert-icon': { color: c.hot },
          }}>{error}</Alert>
        )}

        {/* Email */}
        <Box sx={{ mb: '15px' }}>
          <Typography component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block' }}>
            {t('user')}
          </Typography>
          <TextField fullWidth placeholder="email@business.com" value={email}
            onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} size="small" autoComplete="email" />
        </Box>

        {/* Password */}
        <Box sx={{ mb: '15px' }}>
          <Typography component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block' }}>
            {t('pass')}
          </Typography>
          <TextField fullWidth type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} size="small" autoComplete="current-password" />
          <Button size="small" onClick={() => { setForgotEmail(email); setShowForgot(true); setForgotSent(false); setForgotError(''); }}
            sx={{ mt: '6px', p: 0, fontSize: 10, color: c.accent, textTransform: 'none', minWidth: 'auto', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
            שכחת סיסמה?
          </Button>
        </Box>

        {/* Sign In */}
        <Button fullWidth variant="contained" onClick={handleSubmit} disabled={loading}
          sx={{ mt: '8px', p: '12px', fontSize: 13, fontWeight: 800, borderRadius: '10px' }}>
          {loading ? t('signing_in') : t('login')}
        </Button>

        {/* Register link */}
        <Button fullWidth onClick={() => router.push('/register')}
          sx={{ mt: '12px', color: c.text3, fontSize: 11, textTransform: 'none',
            '&:hover': { color: c.accent, bgcolor: 'transparent' } }}>
          אין לך חשבון? <span style={{ color: c.accent, marginLeft: 4 }}>צור חשבון עסקי →</span>
        </Button>
      </Box>

      {/* ══ Forgot Password Modal ══ */}
      {showForgot && (
        <Box onClick={(e) => { if (e.target === e.currentTarget) setShowForgot(false); }} sx={{
          position: 'fixed', inset: 0, zIndex: 9999, bgcolor: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', p: '20px', backdropFilter: 'blur(10px)',
        }}>
          <Box sx={{
            bgcolor: c.surface1, border: '1px solid ' + c.border2, borderRadius: '20px',
            p: '30px', width: 380, maxWidth: '96vw',
            boxShadow: '0 0 0 1px ' + c.border + ', 0 50px 120px rgba(0,0,0,0.65)',
            animation: 'fadeUp 0.28s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, mb: '6px' }}>
              איפוס סיסמה
            </Typography>
            <Typography sx={{ fontSize: 12, color: c.text3, mb: '20px', lineHeight: 1.6 }}>
              הכנס כתובת מייל ונשלח לך קישור לאיפוס.
            </Typography>

            {forgotSent ? (
              <Box sx={{ bgcolor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', p: '16px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 28, mb: '8px' }}>📧</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#22c55e', mb: '4px' }}>{t('reset_sent')}</Typography>
                <Typography sx={{ fontSize: 11, color: c.text3 }}>
                  בדוק את תיבת המייל: <strong>{forgotEmail}</strong>
                </Typography>
              </Box>
            ) : (
              <>
                {forgotError && (
                  <Alert severity="error" sx={{ mb: '12px', bgcolor: c.hotDim, border: '1px solid rgba(255,77,109,0.25)', borderRadius: '10px', fontSize: 12, color: c.hot, '& .MuiAlert-icon': { color: c.hot } }}>
                    {forgotError}
                  </Alert>
                )}
                <Typography component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block' }}>
                  כתובת מייל
                </Typography>
                <TextField fullWidth placeholder="email@business.com" value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)} size="small"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }} />
              </>
            )}

            <Box sx={{ display: 'flex', gap: '8px', mt: '18px', justifyContent: 'flex-end' }}>
              <Button size="small" variant="outlined" onClick={() => setShowForgot(false)}>
                {forgotSent ? 'סגור' : 'ביטול'}
              </Button>
              {!forgotSent && (
                <Button size="small" variant="contained" onClick={handleForgotPassword}>
                  שלח קישור
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
