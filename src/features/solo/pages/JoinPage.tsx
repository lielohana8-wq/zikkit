'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Divider, Paper, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthProvider';
import { zikkitColors as c } from '@/styles/theme';
import { ROLE_LABELS, roleHome, soloRoleOf } from '../roles';
import type { Invite } from '@/types';

/** /join/<token> — a team member signs up with the exact email the owner invited. */
export default function JoinPage({ token }: { token: string }) {
  const { register, loginWithGoogle, login, loading, error, clearError, user, firebaseUser, logout } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [mismatch, setMismatch] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(getFirestoreDb(), 'invites', token));
        if (!snap.exists() || snap.data()?.status === 'revoked') { setState('missing'); return; }
        setInvite(snap.data() as Invite); setState('ready');
      } catch { setState('missing'); }
    })();
  }, [token]);

  // Signed in with the wrong Google account? Bounce.
  useEffect(() => {
    if (!invite || !firebaseUser) return;
    const signedEmail = (firebaseUser.email || '').toLowerCase();
    if (signedEmail && signedEmail !== invite.email.toLowerCase()) {
      setMismatch(`You're signed in as ${signedEmail}, but this invite is for ${invite.email}. Sign out and use the invited email.`);
      return;
    }
    if (user && String(user.role) !== 'pending') router.replace(roleHome(soloRoleOf(user)));
  }, [invite, firebaseUser, user, router]);

  if (state === 'loading') return <Shell><CircularProgress size={26} /></Shell>;
  if (state === 'missing' || !invite) return <Shell><Typography sx={{ fontWeight: 800, fontSize: 18 }}>This invite link is invalid or was revoked.</Typography><Typography sx={{ color: c.text3, mt: 1 }}>Ask the business owner for a new one.</Typography></Shell>;

  const submit = async () => {
    clearError(); setMismatch(null);
    if (mode === 'signup') await register(invite.email, password, '');
    else await login(invite.email, password);
  };

  return (
    <Shell>
      <Paper sx={{ width: '100%', maxWidth: 420, p: 3.5, borderRadius: 4, border: `1px solid ${c.border}` }}>
        <Typography sx={{ fontSize: 12, color: c.text3, fontWeight: 700, letterSpacing: 0.5 }}>YOU'RE INVITED</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 22, mt: 0.5 }}>{invite.bizName}</Typography>
        <Typography sx={{ fontSize: 14, color: c.text2, mb: 3 }}>Hi {invite.name} — join as <b>{ROLE_LABELS[invite.role] || invite.role}</b>.</Typography>
        {invite.status === 'accepted' && <Alert severity="info" sx={{ mb: 2 }}>This invite was already used. Sign in below.</Alert>}
        {(error || mismatch) && <Alert severity="error" sx={{ mb: 2 }} action={mismatch ? <Button size="small" color="inherit" onClick={logout}>Sign out</Button> : undefined}>{mismatch || error}</Alert>}
        <TextField label="Email" value={invite.email} fullWidth disabled sx={{ mb: 1.5 }} helperText="Locked to the invited email" />
        <TextField label={mode === 'signup' ? 'Choose a password' : 'Password'} type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth sx={{ mb: 2 }} helperText={mode === 'signup' ? 'At least 6 characters' : undefined} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <Button variant="contained" fullWidth size="large" onClick={submit} disabled={loading || password.length < 6}>{loading ? 'Working…' : mode === 'signup' ? 'Create my account' : 'Sign in'}</Button>
        <Divider sx={{ my: 2, fontSize: 12, color: c.text3 }}>or</Divider>
        <Button variant="outlined" fullWidth onClick={loginWithGoogle} disabled={loading}>Continue with Google ({invite.email})</Button>
        <Typography sx={{ fontSize: 13, color: c.text3, mt: 3, textAlign: 'center' }}>
          {mode === 'signup' ? <>Already have an account? <Button size="small" onClick={() => setMode('signin')}>Sign in</Button></> : <>New here? <Button size="small" onClick={() => setMode('signup')}>Create account</Button></>}
        </Typography>
      </Paper>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: c.bg, textAlign: 'center' }}>{children}</Box>;
}
