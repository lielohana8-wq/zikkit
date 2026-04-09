'use client';

import { Box, Button, Typography } from '@mui/material';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { zikkitColors as c } from '@/styles/theme';

export function IdleWarning() {
  const { user, logout } = useAuth();
  const { showWarning, countdown, resetIdle } = useIdleTimeout({
    onTimeout: logout,
    enabled: !!user,
  });

  if (!showWarning) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a2a20',
        border: `1px solid ${c.accent}`,
        borderRadius: '10px',
        p: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 8888,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <Typography sx={{ fontSize: 13, color: '#e2f0ea' }}>
        ⏱️ Session expires in <strong>{countdown}</strong>
      </Typography>
      <Button
        onClick={resetIdle}
        size="small"
        sx={{
          bgcolor: c.accent,
          color: '#000',
          fontWeight: 700,
          fontSize: 12,
          p: '6px 14px',
          borderRadius: '6px',
          '&:hover': { bgcolor: c.accent2 },
        }}
      >
        Stay Logged In
      </Button>
    </Box>
  );
}
