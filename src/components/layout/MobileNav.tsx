'use client';
import { useState } from 'react';
import { Box, Typography, SwipeableDrawer, Divider } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { zikkitColors as c } from '@/styles/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';

const OWNER_MAIN = [
  { icon: '📊', he: 'ראשי', href: '/dashboard' },
  { icon: '🔧', he: 'עבודות', href: '/jobs' },
  { icon: '📅', he: 'יומן', href: '/schedule' },
  { icon: '👥', he: 'לידים', href: '/leads' },
  { icon: '☰', he: 'עוד', href: '#more' },
];

const OWNER_MORE = [
  { icon: '📄', he: 'הצעות מחיר', href: '/quotes' },
  { icon: '🧑', he: 'לקוחות', href: '/customers' },
  { icon: '👷', he: 'צוות', href: '/technicians' },
  { icon: '💰', he: 'כספים', href: '/reports' },
  { icon: '🤖', he: 'בוט AI', href: '/aibot' },
  { icon: '📦', he: 'מוצרים', href: '/products' },
  { icon: '🗺️', he: 'GPS', href: '/gps-tracking' },
  { icon: '⚙️', he: 'הגדרות', href: '/settings' },
];

const TECH_MAIN = [
  { icon: '📊', he: 'ראשי', href: '/tech/dashboard' },
  { icon: '🔧', he: 'עבודות', href: '/tech/jobs' },
  { icon: '📅', he: 'יומן', href: '/tech/schedule' },
  
];

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const perms = useRolePermissions(user?.role, user?.customPermissions);
  const [moreOpen, setMoreOpen] = useState(false);
  const isTech = perms.isTechnician;
  const items = isTech ? TECH_MAIN : OWNER_MAIN;

  const handleNav = (href: string) => {
    if (href === '#more') { setMoreOpen(true); return; }
    router.push(href);
    setMoreOpen(false);
  };

  return (
    <>
      <Box sx={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        bgcolor: c.surface1, borderTop: '1px solid ' + c.border, zIndex: 100,
        justifyContent: 'space-around', alignItems: 'center',
        pb: 'env(safe-area-inset-bottom, 0px)', pt: '6px', minHeight: 56,
        '@media (max-width: 768px)': { display: 'flex !important' },
      }}>
        {items.map((item) => {
          const active = item.href !== '#more' && (pathname === item.href || pathname?.startsWith(item.href + '/'));
          return (
            <Box key={item.href} onClick={() => handleNav(item.href)} sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              cursor: 'pointer', gap: '2px',
              color: active ? c.accent : c.text3,
              minWidth: 48, minHeight: 42, justifyContent: 'center',
              position: 'relative',
              '&:active': { transform: 'scale(0.92)' },
            }}>
              <Box sx={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</Box>
              <Typography sx={{ fontSize: 9.5, fontWeight: active ? 600 : 400, color: active ? c.accent : c.text3 }}>{item.he}</Typography>
              {active && <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2.5, borderRadius: 2, bgcolor: c.accent }} />}
            </Box>
          );
        })}
      </Box>

      {/* More drawer */}
      {!isTech && (
        <SwipeableDrawer anchor="bottom" open={moreOpen} onClose={() => setMoreOpen(false)} onOpen={() => setMoreOpen(true)}
          PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxHeight: '70vh', direction: 'rtl' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: '8px', pb: '4px' }}>
            <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: c.border2 }} />
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: c.text, mb: 2 }}>תפריט</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {OWNER_MORE.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Box key={item.href} onClick={() => handleNav(item.href)} sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    p: '12px 4px', borderRadius: '12px', cursor: 'pointer',
                    bgcolor: active ? c.accentDim : 'transparent',
                    '&:active': { transform: 'scale(0.95)' },
                  }}>
                    <Box sx={{ fontSize: 24 }}>{item.icon}</Box>
                    <Typography sx={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? c.accent : c.text2, textAlign: 'center' }}>{item.he}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </SwipeableDrawer>
      )}
    </>
  );
}
