import { Box, Typography, Button } from '@mui/material';

export default function NotFound() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#07090B',
        textAlign: 'center',
        gap: 2,
        px: 3,
      }}
    >
      <Typography sx={{ fontSize: 80, fontWeight: 900, color: '#00E5B0', fontFamily: 'Syne, sans-serif' }}>
        404
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#e8f0f4' }}>
        Page not found
      </Typography>
      <Typography sx={{ fontSize: 14, color: '#5a7080', maxWidth: 380 }}>
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button
        href="/dashboard"
        sx={{
          mt: 2,
          bgcolor: '#00E5B0',
          color: '#000',
          fontWeight: 700,
          fontSize: 13,
          px: 4,
          py: 1.2,
          borderRadius: '10px',
          textTransform: 'none',
          '&:hover': { bgcolor: '#00c49a' },
        }}
      >
        Back to Dashboard
      </Button>
    </Box>
  );
}
