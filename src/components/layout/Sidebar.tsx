'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Tooltip, Typography } from '@mui/material';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';

interface NavItem { key: string; icon: string; label: string; href: string }
const OWNER_NAV: NavItem[] = [
  { key: 'dashboard', icon: '📊', label: 'דשבורד', href: '/dashboard' },
  { key: 'jobs', icon: '🔧', label: 'עבודות', href: '/jobs' },
  { key: 'schedule', icon: '📅', label: 'לוח זמנים', href: '/schedule' },
  { key: 'leads', icon: '👥', label: 'לידים', href: '/leads' },
  { key: 'customers', icon: '🧑', label: 'לקוחות', href: '/customers' },
  { key: 'quotes', icon: '📄', label: 'הצעות מחיר', href: '/quotes' },
  { key: 'team', icon: '👷', label: 'צוות', href: '/technicians' },
  { key: 'finance', icon: '💰', label: 'כספים', href: '/reports' },
  { key: 'automation', icon: '🤖', label: 'אוטומציה', href: '/aibot' },
  { key: 'products', icon: '📦', label: 'מוצרים ומלאי', href: '/products' },
  { key: 'gps', icon: '🗺️', label: 'GPS', href: '/gps-tracking' },
  { key: 'settings', icon: '⚙️', label: 'הגדרות', href: '/settings' },
];
const TECH_NAV: NavItem[] = [
  { key: 'tech-dashboard', icon: '📊', label: 'הדשבורד שלי', href: '/tech/dashboard' },
  { key: 'tech-jobs', icon: '🔧', label: 'העבודות שלי', href: '/tech/jobs' },
  { key: 'tech-quotes', icon: '📄', label: 'ההצעות שלי', href: '/tech/quotes' },
  { key: 'tech-schedule', icon: '📅', label: 'לוח זמנים', href: '/tech/schedule' },
  { key: 'tech-gps', icon: '📍', label: 'המיקום שלי', href: '/tech/gps' },
];

export function Sidebar() {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const perms = useRolePermissions(user?.role, user?.customPermissions);
  const isTech = pathname.startsWith('/tech/') || pathname === '/tech';
  const nav = (isTech || perms.isTechnician) ? TECH_NAV : OWNER_NAV;
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const exp = hovered;

  return (
    <Box component="nav" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      sx={{
        width: exp ? 210 : 58, minWidth: exp ? 210 : 58, height: '100vh',
        background: '#1C1917', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1), min-width 0.25s cubic-bezier(0.22,1,0.36,1)',
        zIndex: 30, '@media (max-width: 768px)': { display: 'none !important' },
      }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '16px 13px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <Box sx={{ width: 32, height: 32, minWidth: 32, background: 'linear-gradient(135deg,#6366F1,#818CF8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Z</Typography>
        </Box>
        {exp && <Box><Typography sx={{ fontWeight: 800, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>Zikkit</Typography>
          <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{(isTech || perms.isTechnician) ? 'טכנאי' : 'ניהול עסק'}</Typography></Box>}
      </Box>
      <Box sx={{ overflow: 'auto', flex: 1, py: 0.5 }}>
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Tooltip key={item.key} title={exp ? '' : item.label} placement="left" arrow>
              <Box onClick={() => router.push(item.href)} sx={{
                display: 'flex', alignItems: 'center', gap: '10px',
                mx: '6px', mb: '1px', p: exp ? '8px 10px' : '8px 0',
                justifyContent: exp ? 'flex-start' : 'center',
                cursor: 'pointer', position: 'relative', borderRadius: 8,
                color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                transition: 'all 0.15s',
                '&:hover': { color: '#fff', background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.06)' },
                '&::before': { content: '""', position: 'absolute', right: -6, top: '22%', bottom: '22%', width: 3, borderRadius: '3px 0 0 3px', background: active ? '#6366F1' : 'transparent' },
              }}>
                <Box sx={{ fontSize: 15, minWidth: 22, textAlign: 'center', flexShrink: 0 }}>{item.icon}</Box>
                {exp && <Typography component="span" sx={{ fontSize: 12, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{item.label}</Typography>}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ flexShrink: 0, p: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Box onClick={logout} sx={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', p: '8px', borderRadius: 8, justifyContent: exp ? 'flex-start' : 'center', '&:hover': { background: 'rgba(255,255,255,0.06)' } }}>
          <Box sx={{ width: 30, height: 30, minWidth: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>{initials}</Box>
          {exp && <Box><Typography sx={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</Typography>
            <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>יציאה</Typography></Box>}
        </Box>
      </Box>
    </Box>
  );
}
