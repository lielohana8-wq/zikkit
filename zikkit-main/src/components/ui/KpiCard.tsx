'use client';
import { Box, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
type KpiVariant = 'accent' | 'blue' | 'green' | 'warm' | 'hot' | 'teal' | 'purple';
const V: Record<KpiVariant, string> = { accent: '#4F46E5', blue: '#2563EB', green: '#059669', warm: '#D97706', hot: '#E11D48', teal: '#0D9488', purple: '#7C3AED' };
interface KpiCardProps { label: string; value: string | number; subtitle?: string; variant?: KpiVariant; }
export function KpiCard({ label, value, subtitle, variant = 'accent' }: KpiCardProps) {
  return (
    <Box sx={{ bgcolor: c.surface1, borderRadius: '12px', p: '16px 18px', borderRight: '3px solid ' + V[variant], transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 400, color: c.text3, mb: '6px' }}>{label}</Typography>
      <Typography sx={{ fontFamily: "'Rubik', sans-serif", fontSize: 26, fontWeight: 600, lineHeight: 1, color: c.text, letterSpacing: '-0.5px' }}>{value}</Typography>
      {subtitle && <Typography sx={{ fontSize: 11, color: c.text3, mt: '5px' }}>{subtitle}</Typography>}
    </Box>
  );
}
