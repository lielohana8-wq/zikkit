'use client';

import { Box, Typography, Button } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: '60px 20px',
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <Box sx={{ fontSize: 56, mb: '16px', opacity: 0.5 }}>{icon}</Box>
      <Typography
        sx={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 18,
          fontWeight: 800,
          mb: '8px',
          color: c.text2,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          sx={{ fontSize: 13, color: c.text3, maxWidth: 280, lineHeight: 1.7, mb: '20px' }}
        >
          {subtitle}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" size="small" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
