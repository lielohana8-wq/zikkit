'use client';

import { Box } from '@mui/material';

function Skeleton({ width = '100%', height = 16, radius = 8 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius: `${radius}px`,
        bgcolor: 'rgba(0,0,0,0.03)',
        animation: 'pulse 1.5s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      }}
    />
  );
}

export default function Loading() {
  return (
    <Box sx={{ p: { xs: '16px', md: '24px 28px' }, animation: 'fadeIn 0.3s ease' }}>
      {/* Page title skeleton */}
      <Skeleton width={200} height={28} radius={10} />
      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {[1, 2, 3, 4].map((i) => (
          <Box
            key={i}
            sx={{
              p: 2.5,
              borderRadius: '14px',
              bgcolor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(0,0,0,0.03)',
            }}
          >
            <Skeleton width={80} height={12} />
            <Box sx={{ mt: 1.5 }}><Skeleton width={120} height={28} radius={6} /></Box>
            <Box sx={{ mt: 1 }}><Skeleton width={60} height={10} /></Box>
          </Box>
        ))}
      </Box>
      {/* Content area skeleton */}
      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,0,0,0.03)' }}>
          <Skeleton width={140} height={16} />
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={40} radius={10} />
            ))}
          </Box>
        </Box>
        <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,0,0,0.03)' }}>
          <Skeleton width={140} height={16} />
          <Box sx={{ mt: 2 }}><Skeleton height={200} radius={12} /></Box>
        </Box>
      </Box>
    </Box>
  );
}
