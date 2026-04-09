'use client';
import { Box } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { zikkitColors as c } from '@/styles/theme';
interface TabItem { label: string; href: string; icon?: string }
export function PageTabs({ tabs }: { tabs: TabItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Box sx={{ display: 'flex', gap: '4px', mb: 2, bgcolor: c.surface3, borderRadius: '24px', p: '3px', overflow: 'auto' }}>
      {tabs.map(tab => {
        const a = pathname === tab.href;
        return (
          <Box key={tab.href} onClick={() => router.push(tab.href)} sx={{ px: 2, py: '7px', borderRadius: '20px', cursor: 'pointer', fontSize: 12.5, fontWeight: a ? 600 : 400, color: a ? c.accent : c.text3, bgcolor: a ? c.surface1 : 'transparent', boxShadow: a ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { color: a ? c.accent : c.text2 } }}>
            {tab.icon && <span style={{ fontSize: 13 }}>{tab.icon}</span>}{tab.label}
          </Box>
        );
      })}
    </Box>
  );
}
