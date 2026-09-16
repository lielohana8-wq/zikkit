'use client';
import { Box, type SxProps, type Theme } from '@mui/material';
interface BadgeProps { label: string; variant?: string; sx?: SxProps<Theme>; }
function getStyle(v: string): { bg: string; color: string } {
  switch (v) {
    case 'hot': return { bg: 'rgba(225,29,72,0.08)', color: '#E11D48' };
    case 'warm': return { bg: 'rgba(217,119,6,0.08)', color: '#D97706' };
    case 'open': case 'blue': return { bg: 'rgba(37,99,235,0.08)', color: '#2563EB' };
    case 'done': case 'green': return { bg: 'rgba(5,150,105,0.08)', color: '#059669' };
    case 'new': case 'accent': return { bg: 'rgba(79,70,229,0.08)', color: '#4F46E5' };
    case 'purple': return { bg: 'rgba(124,58,237,0.08)', color: '#7C3AED' };
    case 'teal': return { bg: 'rgba(13,148,136,0.08)', color: '#0D9488' };
    default: return { bg: 'rgba(0,0,0,0.04)', color: '#78716C' };
  }
}
export function Badge({ label, variant, sx }: BadgeProps) {
  const s = getStyle(variant || 'grey');
  return (<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', px: '10px', py: '3px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, bgcolor: s.bg, color: s.color, ...sx }}>{label}</Box>);
}
