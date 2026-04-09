'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Typography, TextField, InputAdornment, Paper, Chip } from '@mui/material';
import { Search, Work, People, Description, Person } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/useFirestore';
import { zikkitColors as c } from '@/styles/theme';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { db } = useData();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true); } if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const items: { type: string; icon: any; label: string; sub: string; href: string; color: string }[] = [];

    // Search jobs
    (db.jobs || []).forEach((j: any) => {
      if (j.client?.toLowerCase().includes(q) || j.phone?.includes(q) || j.address?.toLowerCase().includes(q) || j.desc?.toLowerCase().includes(q) || j.num?.includes(q)) {
        items.push({ type: 'עבודה', icon: <Work sx={{ fontSize: 14 }} />, label: `${j.num || '#' + j.id} — ${j.client}`, sub: j.address || j.desc || '', href: '/jobs', color: '#3B82F6' });
      }
    });

    // Search leads
    (db.leads || []).forEach((l: any) => {
      if (l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q)) {
        items.push({ type: 'ליד', icon: <People sx={{ fontSize: 14 }} />, label: l.name, sub: l.phone || l.email || '', href: '/leads', color: '#F59E0B' });
      }
    });

    // Search quotes
    (db.quotes || []).forEach((qt: any) => {
      if (qt.client?.toLowerCase().includes(q) || qt.phone?.includes(q)) {
        items.push({ type: 'הצעה', icon: <Description sx={{ fontSize: 14 }} />, label: `${qt.num || '#' + qt.id} — ${qt.client}`, sub: qt.total ? `₪${qt.total}` : '', href: '/quotes', color: '#8B5CF6' });
      }
    });

    // Search users/techs
    (db.users || []).forEach((u: any) => {
      if (u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.email?.toLowerCase().includes(q)) {
        items.push({ type: 'צוות', icon: <Person sx={{ fontSize: 14 }} />, label: u.name, sub: u.role || '', href: '/technicians', color: '#10B981' });
      }
    });

    return items.slice(0, 10);
  }, [query, db]);

  return (
    <Box ref={ref} sx={{ position: 'relative', width: open ? { xs: '100%', md: 400 } : 200, transition: 'width 0.3s' }}>
      <TextField
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="חיפוש... (Ctrl+K)"
        size="small"
        fullWidth
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: c.text3 }} /></InputAdornment>,
        }}
        sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, borderRadius: 2, bgcolor: c.glass2 || 'rgba(255,255,255,0.05)' } }}
      />
      {open && results.length > 0 && (
        <Paper sx={{
          position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, zIndex: 999,
          maxHeight: 400, overflow: 'auto', borderRadius: 2,
          bgcolor: c.surface2 || '#111830', border: `1px solid ${c.border2 || 'rgba(255,255,255,0.1)'}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          {results.map((r, i) => (
            <Box key={i} onClick={() => { router.push(r.href); setOpen(false); setQuery(''); }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, cursor: 'pointer', borderBottom: `1px solid ${c.border}`, '&:hover': { bgcolor: c.glass2 || 'rgba(255,255,255,0.05)' }, '&:last-child': { borderBottom: 'none' } }}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color }}>{r.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }} noWrap>{r.label}</Typography>
                <Typography sx={{ fontSize: 10, color: c.text3 }} noWrap>{r.sub}</Typography>
              </Box>
              <Chip label={r.type} size="small" sx={{ fontSize: 9, height: 18, bgcolor: `${r.color}15`, color: r.color }} />
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
