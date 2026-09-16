'use client';

import { Box, Typography } from '@mui/material';
import { useToast } from '@/hooks/useToast';
import { zikkitColors as c } from '@/styles/theme';

export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <Box
          key={toast.id}
          sx={{
            bgcolor: c.surface3,
            border: `1px solid ${toast.color || c.accent}`,
            borderRadius: '10px',
            p: '10px 18px',
            animation: 'fadeUp 0.25s ease',
            pointerEvents: 'auto',
          }}
        >
          <Typography sx={{ fontSize: 13, color: toast.color || c.accent, fontWeight: 600 }}>
            {toast.message}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
