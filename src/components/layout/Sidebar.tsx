'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Tooltip, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';

interface NavItem { key: string; icon: string; label: string; href: string; badge?: number }

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
  { key: 'tech-schedule', icon: '📅', label: 'לוח זמנים', href: '/tech/schedule' },
];

export function Sidebar() {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const perms = useRolePermissions(user?.role, user?.customPermissions);
  const isTechPath = pathname.startsWith('/tech/') || pathname === '/tech';
  const navItems = (isTechPath || perms.isTechnician) ? TECH_NAV : OWNER_NAV;
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const expanded = hovered;

  return (
    <Box
      component="nav"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: expanded ? 200 : 58, minWidth: expanded ? 200 : 58, height: '100vh',
        background: `linear-gradient(180deg, ${c.surface1}F0 0%, ${c.surface2 || c.surface1}F0 100%)`,
        backdropFilter: 'blur(24px)',
        borderRight: `1px solid ${c.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1), min-width 0.3s cubic-bezier(0.22,1,0.36,1)',
        zIndex: 30,
        '@media (max-width: 600px)': { display: 'none !important' },
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '16px 12px 14px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <Box sx={{
          width: 36, height: 36, minWidth: 36,
          background: `linear-gradient(135deg, ${c.accent}, ${c.purple || c.accent2 || '#8B5CF6'})`,
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px ${c.accentGlow}`,
        }}>
          <Typography sx={{ fontWeight: 900, fontSize: 15, color: '#000' }}>Z</Typography>
        </Box>
        {expanded && (
          <Box sx={{ opacity: 1, transition: 'opacity 0.25s', overflow: 'hidden' }}>
            <Typography sx={{ fontWeight: 900, fontSize: 14, letterSpacing: '-0.3px', lineHeight: 1.2,
              background: `linear-gradient(135deg, ${c.accent}, ${c.purple || '#8B5CF6'})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Zikkit</Typography>
            <Typography sx={{ fontSize: 9, color: c.text3 }}>
              {(isTechPath || perms.isTechnician) ? 'טכנאי' : 'עסק'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{ overflow: 'auto', flex: 1, width: '100%', py: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Tooltip key={item.key} title={expanded ? '' : item.label} placement="right" arrow>
              <Box
                onClick={() => router.push(item.href)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', p: expanded ? '9px 14px 9px 16px' : '9px 0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  cursor: 'pointer', position: 'relative',
                  color: isActive ? c.accent : c.text3,
                  background: isActive ? (c.accentDim || 'rgba(0,229,176,0.08)') : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { color: isActive ? c.accent : c.text || '#eee', background: isActive ? (c.accentDim || 'rgba(0,229,176,0.08)') : (c.glass2 || 'rgba(255,255,255,0.05)') },
                  '&::before': {
                    content: '""', position: 'absolute', right: 0, top: '20%', bottom: '20%',
                    width: 3, borderRadius: '3px 0 0 3px',
                    background: isActive ? c.accent : 'transparent',
                    boxShadow: isActive ? `0 0 12px ${c.accentGlow}` : 'none',
                  },
                }}
              >
                <Box sx={{ fontSize: 16, minWidth: 22, textAlign: 'center', flexShrink: 0, transition: 'transform 0.2s', filter: isActive ? `drop-shadow(0 0 6px ${c.accentGlow})` : 'none' }}>
                  {item.icon}
                </Box>
                {expanded && (
                  <Typography component="span" sx={{ fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {item.label}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* User */}
      <Box sx={{ flexShrink: 0, width: '100%', p: '10px', borderTop: `1px solid ${c.border}` }}>
        <Box onClick={logout} sx={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', p: '8px', borderRadius: 2, justifyContent: expanded ? 'flex-start' : 'center', '&:hover': { background: c.glass2 || 'rgba(255,255,255,0.05)' } }}>
          <Box sx={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${c.accent}, ${c.purple || '#8B5CF6'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000' }}>
            {initials}
          </Box>
          {expanded && (
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: c.text2 }}>{user?.name || 'User'}</Typography>
              <Typography sx={{ fontSize: 9, color: c.text3 }}>יציאה</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
