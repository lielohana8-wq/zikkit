'use client';
import { useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';

interface SwipeAction {
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeActionsProps {
  children: ReactNode;
  actions: SwipeAction[];
}

export function SwipeActions({ children, actions }: SwipeActionsProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);
  const actionsWidth = actions.length * 72;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const diff = startX.current - e.touches[0].clientX;
    const clamped = Math.max(0, Math.min(actionsWidth, diff));
    setOffset(clamped);
  };

  const onTouchEnd = () => {
    dragging.current = false;
    setOffset(offset > actionsWidth / 2 ? actionsWidth : 0);
  };

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', mb: 1 }}>
      {/* Action buttons behind */}
      <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'stretch' }}>
        {actions.map((a, i) => (
          <Box key={i} onClick={() => { a.onClick(); setOffset(0); }}
            sx={{ width: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: a.color, cursor: 'pointer', gap: 0.3 }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#fff' }}>{a.label}</span>
          </Box>
        ))}
      </Box>
      {/* Content layer */}
      <Box
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{
          transform: `translateX(-${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease',
          position: 'relative',
          zIndex: 1,
          bgcolor: c.surface2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
