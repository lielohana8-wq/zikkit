'use client';

import { Box, Typography, Button } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        gap: 2,
        px: 3,
      }}
    >
      <Box sx={{ fontSize: 56, mb: 1 }}>⚠️</Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: c.text }}>
        Something went wrong
      </Typography>
      <Typography sx={{ fontSize: 14, color: c.text3, maxWidth: 400, lineHeight: 1.7 }}>
        An unexpected error occurred. You can try again or go back to the dashboard.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
        <Button
          onClick={reset}
          sx={{
            bgcolor: c.accent,
            color: '#000',
            fontWeight: 700,
            fontSize: 13,
            px: 3,
            py: 1,
            borderRadius: '10px',
            textTransform: 'none',
            '&:hover': { bgcolor: c.accent2 },
          }}
        >
          Try Again
        </Button>
        <Button
          href="/dashboard"
          sx={{
            bgcolor: 'rgba(0,0,0,0.03)',
            color: c.text2,
            fontWeight: 600,
            fontSize: 13,
            px: 3,
            py: 1,
            borderRadius: '10px',
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
          }}
        >
          Go to Dashboard
        </Button>
      </Box>
    </Box>
  );
}
