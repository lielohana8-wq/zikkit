'use client';

import { useState } from 'react';
import { Box, Typography, TextField, Button, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { useGeoDetection } from '@/hooks/useGeoDetection';
import { zikkitColors as c } from '@/styles/theme';

type Step = 'plan' | 'register';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [bizName, setBizName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading, error, clearError, logout } = useAuth();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { plans, isIL } = useGeoDetection();

  // Safe back — sign out first (in case Auth user was partially created)
  const goBackToLogin = async () => {
    try { await logout(); } catch {}
    router.push('/login');
  };

  // Check if just registered
  if (typeof window !== 'undefined' && sessionStorage.getItem('zikkit_registered') && !registrationSuccess) {
    setRegistrationSuccess(true);
    sessionStorage.removeItem('zikkit_registered');
  }
  const router = useRouter();

  const handleRegister = async () => {
    clearError();
    if (!bizName.trim()) return;
    if (!email.includes('@')) return;
    if (password.length < 6) return;
    await register(email, password, bizName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && step === 'register') handleRegister();
  };

  // Success screen after registration
  if (registrationSuccess) {
    return (
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1a0d 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{ maxWidth: 460, mx: 'auto', textAlign: 'center', p: '40px 20px' }}>
          <Box sx={{ fontSize: 64, mb: 2 }}>{'✅'}</Box>
          <Typography sx={{ fontSize: 28, fontWeight: 900, color: '#fff', mb: 1 }}>
            {'החשבון נוצר בהצלחה'}
          </Typography>
          <Typography sx={{ fontSize: 15, color: '#888', mb: 3, lineHeight: 1.7 }}>
            {'שלחנו לך מייל אימות. לחץ על הקישור במייל כדי להפעיל את החשבון.'}
          </Typography>
          <Box sx={{
            bgcolor: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)',
            borderRadius: '14px', p: '20px', mb: 3, textAlign: 'right',
          }}>
            <Typography sx={{ fontSize: 13, color: '#00e5b0', fontWeight: 700, mb: 1 }}>
              {'תוכנית'}: {selectedPlan}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#888', lineHeight: 1.8 }}>
              {'✓ 14 ימי ניסיון חינם — גישה מלאה לכל הפיצ׳רים'}<br/>
              {'✓ אחרי 14 יום — חיוב אוטומטי לפי התוכנית שבחרת'}<br/>
              {'✓ אפשר לבטל בכל רגע'}
            </Typography>
          </Box>
          <Button variant="contained" fullWidth onClick={() => router.push('/dashboard')}
            sx={{ p: '14px', fontSize: 15, fontWeight: 800, borderRadius: '12px', mb: 1 }}>
            {'כניסה למערכת'}
          </Button>
          <Typography sx={{ fontSize: 11, color: '#555', mt: 1 }}>
            {'בדוק את תיבת המייל לאימות'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999, overflow: 'auto',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1a0d 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', p: '40px 20px' }}>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: '48px' }}>
          <Box onClick={goBackToLogin} sx={{
            position: 'absolute', top: 20, left: 20, cursor: 'pointer', color: '#666', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>{'\u2190'} {'\u05D7\u05D6\u05E8\u05D4'}</Box>

          {step === 'plan' ? (
            <>
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mb: '8px' }}>{'\u05D1\u05D7\u05E8 \u05EA\u05D5\u05DB\u05E0\u05D9\u05EA'}</Typography>
              <Typography sx={{ fontSize: 15, color: '#666' }}>{'\u05D4\u05EA\u05D7\u05DC \u05D7\u05D9\u05E0\u05DD. \u05E9\u05D3\u05E8\u05D2 \u05DE\u05EA\u05D9 \u05E9\u05EA\u05E8\u05E6\u05D4.'}</Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mb: '8px' }}>{'\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF'}</Typography>
              <Typography sx={{ fontSize: 15, color: '#666' }}>
                {'\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA'}: <strong style={{ color: '#3ab54a' }}>{selectedPlan}</strong>
              </Typography>
            </>
          )}
        </Box>

        {step === 'plan' ? (
          /* PRICING GRID */
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', mb: '40px', '@media(max-width:768px)': { gridTemplateColumns: '1fr' } }}>

            {/* Trial */}
            <Box sx={{ background: '#111', border: '1px solid #222', borderRadius: '20px', p: '28px', position: 'relative' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', mb: '12px' }}>{'\u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05D7\u05D9\u05E0\u05DD'}</Typography>
              <Typography sx={{ fontSize: 42, fontWeight: 900, color: '#fff', mb: '4px' }}>$0</Typography>
              <Typography sx={{ fontSize: 13, color: '#555', mb: '24px' }}>14 {'\u05D9\u05D5\u05DD \u05D7\u05D9\u05E0\u05DD'}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: '28px' }}>
                {['\u05D2\u05D9\u05E9\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DC\u05DB\u05DC \u05D4\u05E4\u05D9\u05E6\u05F3\u05E8\u05D9\u05DD', '\u05D1\u05DC\u05D9 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05E9\u05E8\u05D0\u05D9', '\u05E9\u05D3\u05E8\u05D5\u05D2 \u05D1\u05DB\u05DC \u05E2\u05EA'].map((f) => (
                  <Typography key={f} sx={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#3ab54a' }}>{'\u2713'}</span> {f}
                  </Typography>
                ))}
              </Box>
              <Button fullWidth onClick={() => { setSelectedPlan('\u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05D7\u05D9\u05E0\u05DD'); setStep('register'); }}
                sx={{ p: '14px', borderRadius: '12px', border: '1px solid #333', bgcolor: 'transparent', color: '#fff', fontSize: 14, fontWeight: 700,
                  '&:hover': { borderColor: '#3ab54a' } }}>
                {'\u05D4\u05EA\u05D7\u05DC \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05D7\u05D9\u05E0\u05DD'}
              </Button>
            </Box>

            {/* Business Monthly */}
            <Box sx={{ background: 'linear-gradient(135deg, #0d1f0d, #111)', border: '2px solid #3ab54a', borderRadius: '20px', p: '28px', position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', bgcolor: '#3ab54a', color: '#000', fontSize: 11, fontWeight: 800, p: '4px 16px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {'\u05D4\u05DB\u05D9 \u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9'}
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#3ab54a', textTransform: 'uppercase', letterSpacing: '1px', mb: '12px' }}>Business</Typography>
              <Typography sx={{ fontSize: 42, fontWeight: 900, color: '#fff', mb: '4px' }}>{isIL ? '\u20AA499' : '$699'}</Typography>
              <Typography sx={{ fontSize: 13, color: '#555', mb: '24px' }}>{isIL ? '\u05DC\u05D7\u05D5\u05D3\u05E9' : 'per month'}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: '28px' }}>
                {['\u05E2\u05D1\u05D5\u05D3\u05D5\u05EA \u05D5\u05DC\u05D9\u05D3\u05D9\u05DD \u05DC\u05DC\u05D0 \u05D4\u05D2\u05D1\u05DC\u05D4', '\u05D1\u05D5\u05D8 AI \u05E7\u05D5\u05DC\u05D9', '\u05DE\u05E2\u05E7\u05D1 GPS', '\u05D0\u05D5\u05D8\u05D5\u05DE\u05E6\u05D9\u05D4 \u05D5\u05D3\u05D5\u05D7\u05D5\u05EA', '\u05E2\u05D3 10 \u05D8\u05DB\u05E0\u05D0\u05D9\u05DD'].map((f) => (
                  <Typography key={f} sx={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#3ab54a' }}>{'\u2713'}</span> {f}
                  </Typography>
                ))}
              </Box>
              <Button fullWidth onClick={() => { setSelectedPlan('Business \u05D7\u05D5\u05D3\u05E9\u05D9'); setStep('register'); }}
                sx={{ p: '14px', borderRadius: '12px', border: 'none', bgcolor: '#3ab54a', color: '#000', fontSize: 14, fontWeight: 800,
                  '&:hover': { bgcolor: '#4dcc5e' } }}>
                {'\u05D4\u05EA\u05D7\u05DC \u05E2\u05DB\u05E9\u05D9\u05D5'} {'\u2192'}
              </Button>
            </Box>

            {/* Business Annual */}
            <Box sx={{ background: '#111', border: '1px solid #333', borderRadius: '20px', p: '28px', position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', bgcolor: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 800, p: '4px 16px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isIL ? '\u05D7\u05D9\u05E1\u05DB\u05D5\u05DF \u20AA1,500' : 'Save $2,100'}
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', mb: '12px' }}>Business {'\u05E9\u05E0\u05EA\u05D9'}</Typography>
              <Typography sx={{ fontSize: 42, fontWeight: 900, color: '#fff', mb: '4px' }}>{isIL ? '\u20AA4,490' : '$6,290'}</Typography>
              <Typography sx={{ fontSize: 13, color: '#555', mb: '24px' }}>
                {isIL ? '\u05DC\u05E9\u05E0\u05D4' : 'per year'} {'\u00B7'} <span style={{ color: '#f59e0b' }}>{isIL ? '\u20AA374/\u05D7\u05D5\u05D3\u05E9' : '$524/mo'}</span>
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: '28px' }}>
                {['\u05D4\u05DB\u05DC \u05D1-Business', '2 \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD \u05D7\u05D9\u05E0\u05DD', '\u05EA\u05DE\u05D9\u05DB\u05D4 \u05E2\u05D3\u05D9\u05E4\u05D4', '\u05D4\u05D3\u05E8\u05DB\u05D4 \u05D0\u05D9\u05E9\u05D9\u05EA'].map((f) => (
                  <Typography key={f} sx={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#f59e0b' }}>{'\u2713'}</span> {f}
                  </Typography>
                ))}
              </Box>
              <Button fullWidth onClick={() => { setSelectedPlan('Business \u05E9\u05E0\u05EA\u05D9'); setStep('register'); }}
                sx={{ p: '14px', borderRadius: '12px', border: '1px solid #f59e0b', bgcolor: 'transparent', color: '#f59e0b', fontSize: 14, fontWeight: 700,
                  '&:hover': { bgcolor: 'rgba(245,158,11,0.1)' } }}>
                {'\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05E9\u05E0\u05EA\u05D9\u05EA'} {'\u2192'}
              </Button>
            </Box>
          </Box>
        ) : (
          /* REGISTER FORM */
          <Box sx={{ maxWidth: 420, mx: 'auto' }}>
            <Box sx={{
              background: 'linear-gradient(145deg, rgba(15,19,24,0.95), rgba(11,14,18,0.98))',
              border: '1px solid ' + c.border2, borderRadius: '24px', p: '32px',
              boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
            }}>
              {error && (
                <Alert severity="error" sx={{ mb: '14px', bgcolor: c.hotDim, border: '1px solid rgba(255,77,109,0.25)', borderRadius: '10px', fontSize: 12, color: c.hot }}>
                  {error}
                </Alert>
              )}

              {[
                { label: '\u05E9\u05DD \u05D4\u05E2\u05E1\u05E7', value: bizName, set: setBizName, placeholder: '\u05D4\u05E2\u05E1\u05E7 \u05E9\u05DC\u05D9' },
                { label: '\u05DE\u05D9\u05D9\u05DC', value: email, set: setEmail, placeholder: 'email@example.com' },
              ].map((f) => (
                <Box key={f.label} sx={{ mb: '15px' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    {f.label}
                  </Typography>
                  <TextField fullWidth size="small" value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} onKeyDown={handleKeyDown} />
                </Box>
              ))}

              <Box sx={{ mb: '15px' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  {'\u05E1\u05D9\u05E1\u05DE\u05D4 (\u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD)'}
                </Typography>
                <TextField fullWidth size="small" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} onKeyDown={handleKeyDown} />
              </Box>

              <Button fullWidth variant="contained" onClick={handleRegister} disabled={loading}
                sx={{ mt: '8px', p: '12px', fontSize: 13, fontWeight: 800, borderRadius: '10px' }}>
                {loading ? '\u05D9\u05D5\u05E6\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF...' : '\u05E6\u05D5\u05E8 \u05D7\u05E9\u05D1\u05D5\u05DF \u05E2\u05E1\u05E7\u05D9'}
              </Button>

              <Button fullWidth onClick={() => setStep('plan')}
                sx={{ mt: '10px', color: c.text3, fontSize: 11 }}>
                {'\u2190'} {'\u05D7\u05D6\u05E8\u05D4 \u05DC\u05EA\u05D5\u05DB\u05E0\u05D9\u05D5\u05EA'}
              </Button>
            </Box>

            <Button fullWidth onClick={goBackToLogin}
              sx={{ mt: '16px', color: c.text3, fontSize: 11, '&:hover': { color: c.accent } }}>
              {'\u05D9\u05E9 \u05DC\u05DA \u05D7\u05E9\u05D1\u05D5\u05DF? \u05D4\u05EA\u05D7\u05D1\u05E8'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
