'use client';
import { useState } from 'react';
import { Box, Typography, IconButton, Popover } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useNotifications, type Notification } from '@/features/notifications/NotificationProvider';

const typeIcons: Record<string, string> = {
  lead: '👥', job: '🔧', bot: '🤖', payment: '💰', system: '⚙️',
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ position: 'relative', color: c.text3, '&:hover': { color: c.text2 } }}>
        <span style={{ fontSize: 18 }}>🔔</span>
        {unreadCount > 0 && (
          <Box sx={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', bgcolor: c.hot, fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Box>
        )}
      </IconButton>
      <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{ sx: { bgcolor: c.surface2, border: `1px solid ${c.border}`, borderRadius: '14px', width: 320, maxHeight: 400, overflow: 'auto' } }}>
        <Box sx={{ p: '12px 14px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: c.text }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Typography onClick={markAllRead} sx={{ fontSize: 11, color: c.accent, cursor: 'pointer', fontWeight: 600 }}>Mark all read</Typography>
          )}
        </Box>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 24, mb: 0.5 }}>🔕</Typography>
            <Typography sx={{ fontSize: 12, color: c.text3 }}>No notifications yet</Typography>
          </Box>
        ) : notifications.slice(0, 20).map((n) => (
          <Box key={n.id} onClick={() => markRead(n.id)} sx={{ p: '10px 14px', borderBottom: `1px solid ${c.border}`, cursor: 'pointer', bgcolor: n.read ? 'transparent' : 'rgba(0,229,176,0.03)', '&:hover': { bgcolor: c.glass2 }, transition: '0.15s' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>{typeIcons[n.type] || '📌'}</span>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: n.read ? c.text2 : c.text }}>{n.title}</Typography>
                <Typography sx={{ fontSize: 11, color: c.text3, mt: 0.3 }}>{n.message}</Typography>
              </Box>
              {!n.read && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.accent, mt: 0.5, flexShrink: 0 }} />}
            </Box>
          </Box>
        ))}
      </Popover>
    </>
  );
}
