'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Alert, Divider } from '@mui/material';
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
  const { login, loginWithGoogle, loading, error, clearError, user, sendPasswordReset } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();

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

  if (user) return null;

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: c.bg,
        backgroundImage: [
          'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(79,70,229,0.06) 0%, transparent 55%)',
          'radial-gradient(ellipse 50% 40% at 85% 85%, rgba(124,58,237,0.04) 0%, transparent 50%)',
          'radial-gradient(ellipse 40% 30% at 10% 70%, rgba(167,139,250,0.03) 0%, transparent 50%)',
        ].join(','),
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
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#fff',
            boxShadow: '0 8px 28px ' + c.accentGlow + ', 0 0 0 1px rgba(79,70,229,0.25)',
          }}>Zk</Box>
          <Typography sx={{
            fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800,
            color: c.text, letterSpacing: '-1px', textAlign: 'center', lineHeight: 1.1,
          }}>Zikkit</Typography>
        </Box>

        <Typography sx={{ fontSize: 12, color: c.text3, textAlign: 'center', mb: '22px', mt: '2px' }}>
          {t('subtitle') || 'Field Service Management Platform'}
        </Typography>

        {/* Google Sign-In Button */}
        <Button
          fullWidth
          onClick={loginWithGoogle}
          disabled={loading}
          variant="outlined"
          sx={{
            py: '11px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: '10px',
            borderColor: c.border2,
            background: c.surface1,
            color: c.text,
            textTransform: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            mb: '16px',
            '&:hover': {
              borderColor: c.accent,
              background: c.accentDim,
              color: c.text,
            },
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
          </svg>
          {'התחבר עם Google'}
        </Button>

        {/* Divider */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: '18px' }}>
          <Divider sx={{ flex: 1, borderColor: c.border2 }} />
          <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600 }}>{'או'}</Typography>
          <Divider sx={{ flex: 1, borderColor: c.border2 }} />
        </Box>

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
            {'שכחת סיסמה?'}
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
          {'אין לך חשבון?'} <span style={{ color: c.accent, marginLeft: 4 }}>{'צור חשבון עסקי →'}</span>
        </Button>
      </Box>

      {/* Forgot Password Modal */}
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
              {'איפוס סיסמה'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: c.text3, mb: '20px', lineHeight: 1.6 }}>
              {'הכנס כתובת מייל ונשלח לך קישור לאיפוס.'}
            </Typography>

            {forgotSent ? (
              <Box sx={{ bgcolor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', p: '16px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 28, mb: '8px' }}>📧</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#22c55e', mb: '4px' }}>{t('reset_sent')}</Typography>
                <Typography sx={{ fontSize: 11, color: c.text3 }}>
                  {'בדוק את תיבת המייל:'} <strong>{forgotEmail}</strong>
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
                  {'כתובת מייל'}
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
                  {'שלח קישור'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
