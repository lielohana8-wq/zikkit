'use client';
import { Box, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useRouter } from 'next/navigation';

interface Alert { icon: string; text: string; count: number; href: string; color: string; }

export function NeedsAttention({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const total = alerts.reduce((s, a) => s + a.count, 0);
  if (total === 0) return null;
  return (
    <Box sx={{ p: '16px 18px', borderRadius: '14px', bgcolor: 'rgba(255,77,109,0.04)', border: '1px solid rgba(255,77,109,0.1)', mb: 3 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: c.text, mb: 1.5 }}>Needs Attention ({total})</Typography>
      {alerts.filter(a => a.count > 0).map((a, i) => (
        <Box key={i} onClick={() => router.push(a.href)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, cursor: 'pointer', borderBottom: '1px solid ' + c.border, '&:hover': { opacity: 0.8 } }}>
          <Box sx={{ display: 'flex', gap: 1 }}><span>{a.icon}</span><Typography sx={{ fontSize: 13, color: c.text2 }}>{a.text}</Typography></Box>
          <Box sx={{ px: 1, py: 0.2, borderRadius: '6px', bgcolor: a.color + '18', fontSize: 12, fontWeight: 700, color: a.color }}>{a.count}</Box>
        </Box>
      ))}
    </Box>
  );
}
