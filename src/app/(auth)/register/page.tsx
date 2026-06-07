'use client';

import { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Divider } from '@mui/material';
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
  const { register, loginWithGoogle, loading, error, clearError, logout } = useAuth();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { isIL } = useGeoDetection();
  const router = useRouter();

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
            bgcolor: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)',
            borderRadius: '14px', p: '20px', mb: 3, textAlign: 'right',
          }}>
            <Typography sx={{ fontSize: 13, color: '#6366F1', fontWeight: 700, mb: 1 }}>
              {'תוכנית'}: {selectedPlan || 'Trial'}
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
        <Box sx={{ textAlign: 'center', mb: '32px' }}>
          <Box onClick={goBackToLogin} sx={{
            position: 'absolute', top: 20, left: 20, cursor: 'pointer', color: '#666', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>{'←'} {'חזרה'}</Box>

          {step === 'plan' ? (
            <>
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mb: '8px' }}>{'בחר תוכנית'}</Typography>
              <Typography sx={{ fontSize: 15, color: '#666' }}>{'התחל חינם. שדרג מתי שתרצה.'}</Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mb: '8px' }}>{'צור חשבון'}</Typography>
              <Typography sx={{ fontSize: 15, color: '#666' }}>
                {'תוכנית'}: <strong style={{ color: '#6366F1' }}>{selectedPlan}</strong>
              </Typography>
            </>
          )}
        </Box>

        {step === 'plan' ? (
          <>
            {/* Google Sign-Up - quick option above plans */}
            <Box sx={{ maxWidth: 460, mx: 'auto', mb: '40px' }}>
              <Button
                fullWidth
                onClick={loginWithGoogle}
                disabled={loading}
                sx={{
                  py: '14px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#fff',
                  color: '#1f2937',
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                  '&:hover': {
                    background: '#f3f4f6',
                    border: '1px solid rgba(255,255,255,0.25)',
                  },
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
                </svg>
                {'הרשמה מהירה עם Google'}
              </Button>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#666', mt: '10px' }}>
                {'נסיון חינם 14 יום אוטומטי - בלי כרטיס אשראי'}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: '24px' }}>
                <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                <Typography sx={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{'או בחר תוכנית בתשלום'}</Typography>
                <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
              </Box>
            </Box>

            {/* PRICING GRID */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', mb: '40px', '@media(max-width:768px)': { gridTemplateColumns: '1fr' } }}>

              {/* Trial */}
              <Box sx={{ background: '#111', border: '1px solid #222', borderRadius: '20px', p: '28px', position: 'relative' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', mb: '12px' }}>{'ניסיון חינם'}</Typography>
                <Typography sx={{ fontSize: 42, fontWeight: 900, color: '#fff', mb: '4px' }}>$0</Typography>
                <Typography sx={{ fontSize: 13, color: '#555', mb: '24px' }}>14 {'יום חינם'}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: '28px' }}>
                  {['גישה מלאה לכל הפיצ׳רים', 'בלי כרטיס אשראי', 'שדרוג בכל עת'].map((f) => (
                    <Typography key={f} sx={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#6366F1' }}>{'✓'}</span> {f}
                    </Typography>
                  ))}
                </Box>
                <Button fullWidth onClick={() => { setSelectedPlan('ניסיון חינם'); setStep('register'); }}
                  sx={{ p: '14px', borderRadius: '12px', border: '1px solid #333', bgcolor: 'transparent', color: '#fff', fontSize: 14, fontWeight: 700,
                    '&:hover': { borderColor: '#6366F1' } }}>
                  {'התחל ניסיון חינם'}
                </Button>
              </Box>

              {/* Pro Monthly */}
              <Box sx={{ background: 'linear-gradient(135deg, #1a1a2e, #111)', border: '2px solid #6366F1', borderRadius: '20px', p: '28px', position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', bgcolor: '#6366F1', color: '#fff', fontSize: 11, fontWeight: 800, p: '4px 16px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {'הכי פופולרי'}
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '1px', mb: '12px' }}>Pro</Typography>
                <Typography sx={{ fontSize: 42, fontWeight: 900, color: '#fff', mb: '4px' }}>{isIL ? '₪479' : '$129'}</Typography>
                <Typography sx={{ fontSize: 13, color: '#555', mb: '24px' }}>{isIL ? 'לחודש' : 'per month'}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: '28px' }}>
                  {['עבודות ולידים ללא הגבלה', 'בוט AI קולי', 'מעקב GPS', 'אוטומציה ודוחות', 'עד 15 טכנאים'].map((f) => (
                    <Typography key={f} sx={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#6366F1' }}>{'✓'}</span> {f}
                    </Typography>
                  ))}
                </Box>
                <Button fullWidth onClick={() => { setSelectedPlan('Pro חודשי'); setStep('register'); }}
                  sx={{ p: '14px', borderRadius: '12px', border: 'none', bgcolor: '#6366F1', color: '#fff', fontSize: 14, fontWeight: 800,
                    '&:hover': { bgcolor: '#4F46E5' } }}>
                  {'התחל עכשיו'} {'→'}
                </Button>
              </Box>

              {/* Pro Annual */}
              <Box sx={{ background: '#111', border: '1px solid #333', borderRadius: '20px', p: '28px', position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', bgcolor: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 800, p: '4px 16px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {isIL ? 'חיסכון ₪1,149' : 'Save 20%'}
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', mb: '12px' }}>Pro {'שנתי'}</Typography>
                <Typography sx={{ fontSize: 42, fontWeight: 900, color: '#fff', mb: '4px' }}>{isIL ? '₪4,599' : '$1,239'}</Typography>
                <Typography sx={{ fontSize: 13, color: '#555', mb: '24px' }}>
                  {isIL ? 'לשנה' : 'per year'} {'·'} <span style={{ color: '#f59e0b' }}>{isIL ? '₪383/חודש' : '$103/mo'}</span>
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: '28px' }}>
                  {['הכל ב-Pro', '2 חודשים חינם', 'תמיכה עדיפה', 'הדרכה אישית'].map((f) => (
                    <Typography key={f} sx={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#f59e0b' }}>{'✓'}</span> {f}
                    </Typography>
                  ))}
                </Box>
                <Button fullWidth onClick={() => { setSelectedPlan('Pro שנתי'); setStep('register'); }}
                  sx={{ p: '14px', borderRadius: '12px', border: '1px solid #f59e0b', bgcolor: 'transparent', color: '#f59e0b', fontSize: 14, fontWeight: 700,
                    '&:hover': { bgcolor: 'rgba(245,158,11,0.1)' } }}>
                  {'תוכנית שנתית'} {'→'}
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          /* REGISTER FORM */
          <Box sx={{ maxWidth: 420, mx: 'auto' }}>
            <Box sx={{
              background: 'linear-gradient(145deg, rgba(15,19,24,0.95), rgba(11,14,18,0.98))',
              border: '1px solid ' + c.border2, borderRadius: '24px', p: '32px',
              boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
            }}>
              {/* Google option also in form step */}
              <Button
                fullWidth
                onClick={loginWithGoogle}
                disabled={loading}
                sx={{
                  py: '12px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#fff',
                  color: '#1f2937',
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                  mb: '16px',
                  '&:hover': { background: '#f3f4f6' },
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
                </svg>
                {'הרשמה עם Google'}
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: '16px' }}>
                <Divider sx={{ flex: 1, borderColor: c.border2 }} />
                <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600 }}>{'או'}</Typography>
                <Divider sx={{ flex: 1, borderColor: c.border2 }} />
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: '14px', bgcolor: c.hotDim, border: '1px solid rgba(255,77,109,0.25)', borderRadius: '10px', fontSize: 12, color: c.hot }}>
                  {error}
                </Alert>
              )}

              {[
                { label: 'שם העסק', value: bizName, set: setBizName, placeholder: 'העסק שלי' },
                { label: 'מייל', value: email, set: setEmail, placeholder: 'email@example.com' },
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
                  {'סיסמה (לפחות 6 תווים)'}
                </Typography>
                <TextField fullWidth size="small" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={'••••••••'} onKeyDown={handleKeyDown} />
              </Box>

              <Button fullWidth variant="contained" onClick={handleRegister} disabled={loading}
                sx={{ mt: '8px', p: '12px', fontSize: 13, fontWeight: 800, borderRadius: '10px' }}>
                {loading ? 'יוצר חשבון...' : 'צור חשבון עסקי'}
              </Button>

              <Button fullWidth onClick={() => setStep('plan')}
                sx={{ mt: '10px', color: c.text3, fontSize: 11 }}>
                {'←'} {'חזרה לתוכניות'}
              </Button>
            </Box>

            <Button fullWidth onClick={goBackToLogin}
              sx={{ mt: '16px', color: c.text3, fontSize: 11, '&:hover': { color: c.accent } }}>
              {'יש לך חשבון? התחבר'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
