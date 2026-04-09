'use client';

import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { zikkitColors as c } from '@/styles/theme';

const ACTIONS = [
  { icon: '🔧', label: 'עבודה חדשה', href: '/jobs', sub: 'Create work order' },
  { icon: '👥', label: 'ליד חדש', href: '/leads', sub: 'Add prospect' },
  { icon: '📄', label: 'הצעת מחיר חדשה', href: '/quotes', sub: 'Send estimate' },
  { icon: '👷', label: 'Add Technician', href: '/technicians', sub: 'Expand team' },
  { icon: '📈', label: 'צפייה בדוחות', href: '/reports', sub: 'Revenue stats' },
  { icon: '🤖', label: 'בוט AI', href: '/aibot', sub: 'Configure bot' },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '10px',
        mb: '18px',
      }}
    >
      {ACTIONS.map((action) => (
        <Box
          key={action.href}
          onClick={() => router.push(action.href)}
          sx={{
            bgcolor: c.surface2,
            border: `1px solid ${c.border}`,
            borderRadius: '14px',
            p: '16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: c.accent,
              transform: 'translateY(-2px)',
              bgcolor: c.accentDim,
            },
          }}
        >
          <Box sx={{ fontSize: 26, mb: '8px' }}>{action.icon}</Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: c.text2 }}>{action.label}</Typography>
          <Typography sx={{ fontSize: 10, color: c.text3, mt: '3px' }}>{action.sub}</Typography>
        </Box>
      ))}
    </Box>
  );
}
