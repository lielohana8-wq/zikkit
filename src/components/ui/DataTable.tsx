'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Typography,
} from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useState, useEffect } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  mobileHide?: boolean;
  mobileLabel?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyIcon?: string;
  keyExtractor: (row: T) => string | number;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

export function DataTable<T>({
  columns, data, onRowClick, emptyMessage = 'אין נתונים', emptyIcon = '📭', keyExtractor,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  // Empty state
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
        <Box sx={{ fontSize: 40, mb: 1 }}>{emptyIcon}</Box>
        <Typography sx={{ fontSize: 14, color: c.text3 }}>{emptyMessage}</Typography>
      </Box>
    );
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.map((row) => (
          <Box
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            sx={{
              p: '14px', borderRadius: '12px', bgcolor: c.surface2,
              border: `1px solid ${c.border}`, cursor: onRowClick ? 'pointer' : 'default',
              transition: '0.15s', '&:active': onRowClick ? { transform: 'scale(0.98)' } : {},
            }}
          >
            {columns.filter(col => !col.mobileHide).map((col) => (
              <Box key={col.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.4 }}>
                <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600 }}>
                  {col.mobileLabel || col.label}
                </Typography>
                <Box sx={{ fontSize: 13, color: c.text, fontWeight: 500, textAlign: 'right' }}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  }

  // Desktop: Table view
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.key} sx={{ width: col.width, fontSize: 11, fontWeight: 700, color: c.text3, borderColor: c.border }} align={col.align || 'left'}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': { bgcolor: c.glass2 },
                transition: '0.15s',
              }}
            >
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ fontSize: 13, color: c.text2, borderColor: c.border, py: 1.2 }} align={col.align || 'left'}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
