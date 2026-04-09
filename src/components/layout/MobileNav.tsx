'use client';
import { Box, Typography } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { zikkitColors as c } from '@/styles/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useLanguage } from '@/hooks/useLanguage';

const OWNER_MOB = [
  { icon: '📊', he: 'ראשי', href: '/dashboard' },
  { icon: '👥', he: 'לידים', href: '/leads' },
  { icon: '🔧', he: 'עבודות', href: '/jobs' },
  { icon: '📄', he: 'הצעות', href: '/quotes' },
  { icon: '⚙️', he: 'עוד', href: '/settings' },
];
const TECH_MOB = [
  { icon: '📊', he: 'ראשי', href: '/tech/dashboard' },
  { icon: '🔧', he: 'עבודות', href: '/tech/jobs' },
  { icon: '📄', he: 'הצעות', href: '/tech/quotes' },
  { icon: '📅', he: 'יומן', href: '/tech/schedule' },
  { icon: '📍', he: 'מיקום', href: '/tech/gps' },
];

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const perms = useRolePermissions(user?.role, user?.customPermissions);
  const items = perms.isTechnician ? TECH_MOB : OWNER_MOB;
  return (
    <Box sx={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: c.surface1, borderTop: '1px solid ' + c.border, zIndex: 100, justifyContent: 'space-around', alignItems: 'center', pb: 'env(safe-area-inset-bottom, 0px)', pt: '6px', minHeight: 56, '@media (max-width: 768px)': { display: 'flex !important' } }}>
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + '/');
        return (
          <Box key={item.href} onClick={() => router.push(item.href)} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '2px', color: active ? c.accent : c.text3, minWidth: 48, minHeight: 42, justifyContent: 'center', borderRadius: '8px', transition: '0.15s', position: 'relative', '&:active': { transform: 'scale(0.92)' } }}>
            <Box sx={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</Box>
            <Typography sx={{ fontSize: 9.5, fontWeight: active ? 600 : 400, color: active ? c.accent : c.text3 }}>{item.he}</Typography>
            {active && <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2.5, borderRadius: 2, bgcolor: c.accent }} />}
          </Box>
        );
      })}
    </Box>
  );
}
