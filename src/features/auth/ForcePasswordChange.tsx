'use client';

import { useState } from 'react';
import { Box, Typography, TextField, Button, Alert } from '@mui/material';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { zikkitColors as c } from '@/styles/theme';

export function ForcePasswordChange() {
  const { user, changePassword, logout } = useAuth();
  const { db, saveData } = useData();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (newPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPass !== confirmPass) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await changePassword(newPass);
      // Update user record to clear mustChangePassword
      if (user && db.users) {
        const users = [...db.users];
        const idx = users.findIndex((u) => u.email?.toLowerCase() === user.email?.toLowerCase());
        if (idx >= 0) {
          users[idx] = { ...users[idx], mustChangePassword: false, passwordChangedAt: new Date().toISOString() };
          await saveData({ ...db, users });
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9000, bgcolor: c.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0,229,176,0.06) 0%, transparent 55%)',
    }}>
      <Box sx={{
        background: 'linear-gradient(145deg, rgba(15,19,24,0.95), rgba(11,14,18,0.98))',
        border: '1px solid ' + c.border2, borderRadius: '24px', p: '38px',
        width: 420, maxWidth: '96vw',
        boxShadow: '0 0 0 1px ' + c.border + ', 0 40px 100px rgba(0,0,0,0.7)',
        animation: 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <Box sx={{ textAlign: 'center', mb: '24px' }}>
          <Typography sx={{ fontSize: 40, mb: '8px' }}>🔐</Typography>
          <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, mb: '6px' }}>
            Set New Password
          </Typography>
          <Typography sx={{ fontSize: 12, color: c.text3, lineHeight: 1.6 }}>
            Welcome, {user?.name}! For security, please set a new password before continuing.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{
            mb: '14px', bgcolor: c.hotDim, border: '1px solid rgba(255,77,109,0.25)',
            borderRadius: '10px', fontSize: 12, color: c.hot, '& .MuiAlert-icon': { color: c.hot },
          }}>{error}</Alert>
        )}

        <Box sx={{ mb: '15px' }}>
          <Typography component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block' }}>
            New Password
          </Typography>
          <TextField fullWidth type="password" placeholder="Min 6 characters" value={newPass}
            onChange={(e) => setNewPass(e.target.value)} size="small" autoFocus />
        </Box>

        <Box sx={{ mb: '15px' }}>
          <Typography component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block' }}>
            Confirm Password
          </Typography>
          <TextField fullWidth type="password" placeholder="Repeat password" value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)} size="small"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
        </Box>

        {/* Password strength indicator */}
        {newPass.length > 0 && (
          <Box sx={{ mb: '15px' }}>
            <Box sx={{ display: 'flex', gap: '3px', mb: '4px' }}>
              {[1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{
                  flex: 1, height: 3, borderRadius: '2px',
                  bgcolor: newPass.length >= i * 3 ? (newPass.length >= 10 ? '#22c55e' : newPass.length >= 6 ? '#f59e0b' : '#ff4d6d') : 'rgba(255,255,255,0.05)',
                }} />
              ))}
            </Box>
            <Typography sx={{ fontSize: 9, color: newPass.length >= 10 ? '#22c55e' : newPass.length >= 6 ? '#f59e0b' : '#ff4d6d' }}>
              {newPass.length < 6 ? 'Too short' : newPass.length < 10 ? 'Good' : 'Strong'}
            </Typography>
          </Box>
        )}

        <Button fullWidth variant="contained" onClick={handleSubmit} disabled={loading || newPass.length < 6 || newPass !== confirmPass}
          sx={{ p: '12px', fontSize: 13, fontWeight: 800, borderRadius: '10px' }}>
          {loading ? 'Setting password...' : '🔒 Set Password & Continue'}
        </Button>

        <Button fullWidth onClick={logout}
          sx={{ mt: '10px', color: c.text3, fontSize: 11, textTransform: 'none', '&:hover': { color: c.hot } }}>
          Sign out instead
        </Button>
      </Box>
    </Box>
  );
}
