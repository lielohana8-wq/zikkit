'use client';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import type { ReactNode } from 'react';
interface SectionHeaderProps { title: string; subtitle?: string; actions?: ReactNode; sx?: SxProps<Theme>; }
export function SectionHeader({ title, subtitle, actions, sx }: SectionHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '16px 20px 12px', ...sx }}>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: c.text, letterSpacing: '-0.2px', lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 12, color: c.text3, mt: '2px' }}>{subtitle}</Typography>}
      </Box>
      {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</Box>}
    </Box>
  );
}
