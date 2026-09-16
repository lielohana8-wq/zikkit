'use client';
import { Box, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { GlobalSearch } from '@/components/ui/GlobalSearch';

export function Topbar() {
  const { user, logout } = useAuth();
  const { cfg } = useData();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: '14px', md: '22px' }, py: '10px', borderBottom: '1px solid ' + c.border, bgcolor: c.surface1, position: 'sticky', top: 0, zIndex: 40 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {cfg.logo_url ? <Box component="img" src={cfg.logo_url} alt="" sx={{ width: 28, height: 28, borderRadius: '8px', objectFit: 'cover' }} />
          : <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: c.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: c.accent }}>{(cfg.biz_name || 'Z').charAt(0)}</Box>}
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: c.text, display: { xs: 'none', md: 'block' } }}>{cfg.biz_name || 'Zikkit'}</Typography>
      </Box>
      <GlobalSearch />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NotificationBell />
        <Box onClick={logout} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.5, py: 0.5, borderRadius: '20px', '&:hover': { bgcolor: c.surface3 } }}>
          <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff' }}>{(user?.name || 'U').charAt(0).toUpperCase()}</Box>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: c.text2, display: { xs: 'none', md: 'block' } }}>{user?.name?.split(' ')[0] || 'User'}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
