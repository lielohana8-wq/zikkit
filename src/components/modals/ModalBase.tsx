'use client';

import { useRef } from 'react';
import { Box, Typography, IconButton, type SxProps, type Theme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { zikkitColors as c } from '@/styles/theme';
import type { ReactNode } from 'react';

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: number;
  children: ReactNode;
  footer?: ReactNode;
  sx?: SxProps<Theme>;
}

export function ModalBase({ open, onClose, title, maxWidth = 680, children, footer, sx }: ModalBaseProps) {
  const mouseDownTarget = useRef<EventTarget | null>(null);

  if (!open) return null;

  return (
    <Box
      onMouseDown={(e) => { mouseDownTarget.current = e.target; }}
      onMouseUp={(e) => {
        // Only close if BOTH mouseDown AND mouseUp happened on the backdrop itself
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
          onClose();
        }
        mouseDownTarget.current = null;
      }}
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0,0,0,0.78)',
        zIndex: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: '20px',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <Box
        sx={{
          bgcolor: c.surface1,
          border: `1px solid ${c.border2}`,
          borderRadius: '20px',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'fadeUp 0.28s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: `0 0 0 1px ${c.border}, 0 50px 120px rgba(0,0,0,0.65)`,
          ...sx,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: '20px 24px',
            borderBottom: `1px solid ${c.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: "'Syne', sans-serif",
            fontSize: 15,
            fontWeight: 800,
            position: 'sticky',
            top: 0,
            bgcolor: c.surface1,
            zIndex: 1,
            letterSpacing: '-0.3px',
          }}
        >
          <Typography
            sx={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}
          >
            {title}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              bgcolor: c.glass2,
              color: c.text3,
              width: 30,
              height: 30,
              '&:hover': { bgcolor: c.hotDim, color: c.hot },
            }}
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Box>

        {/* Body */}
        <Box sx={{ p: '22px 24px' }}>{children}</Box>

        {/* Footer */}
        {footer && (
          <Box
            sx={{
              p: '14px 24px',
              borderTop: `1px solid ${c.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              position: 'sticky',
              bottom: 0,
              bgcolor: c.surface1,
            }}
          >
            {footer}
          </Box>
        )}
      </Box>
    </Box>
  );
}
