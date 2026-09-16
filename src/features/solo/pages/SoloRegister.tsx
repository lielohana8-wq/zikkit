'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Divider, Paper } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { zikkitColors as c } from '@/styles/theme';

/** English sign-up for the Solo edition (no plan picker — billing comes later). */
export default function SoloRegister() {
  const [bizName, setBizName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loginWithGoogle, loading, error, clearError, user } = useAuth();
  const router = useRouter();

  useEffect(() => { if (user) router.replace('/dashboard'); }, [user, router]);

  const submit = async () => {
    clearError();
    if (!bizName.trim() || !email.includes('@') || password.length < 6) return;
    await register(email, password, bizName.trim());
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: c.bg }}>
      <Paper sx={{ width: '100%', maxWidth: 420, p: 3.5, borderRadius: 4, border: `1px solid ${c.border}` }}>
        <Typography sx={{ fontWeight: 900, fontSize: 24, mb: 0.5 }}>Create your account</Typography>
        <Typography sx={{ fontSize: 13, color: c.text3, mb: 3 }}>Quotes, receipts and closings for field service pros. Free while in early access.</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField label="Business name" value={bizName} onChange={(e) => setBizName(e.target.value)} fullWidth sx={{ mb: 1.5 }} autoFocus />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={{ mb: 1.5 }} />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth sx={{ mb: 2 }} helperText="At least 6 characters" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <Button variant="contained" fullWidth size="large" onClick={submit} disabled={loading || !bizName.trim() || !email.includes('@') || password.length < 6}>{loading ? 'Creating…' : 'Create account'}</Button>
        <Divider sx={{ my: 2, fontSize: 12, color: c.text3 }}>or</Divider>
        <Button variant="outlined" fullWidth onClick={loginWithGoogle} disabled={loading}>Continue with Google</Button>
        <Typography sx={{ fontSize: 13, color: c.text3, mt: 3, textAlign: 'center' }}>Already have an account? <Button size="small" onClick={() => router.push('/login')}>Sign in</Button></Typography>
      </Paper>
    </Box>
  );
}
