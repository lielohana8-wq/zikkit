'use client';
import { Box } from '@mui/material';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useDirection } from '@/hooks/useDirection';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { dir } = useDirection();
  return (
    <Box dir={dir} sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <Box sx={{ flex: 1, overflow: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
