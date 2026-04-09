'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, Paper, Avatar, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Search, Person, Phone, Email, LocationOn, Work, Star, History, Add, Edit } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { zikkitColors as c } from '@/styles/theme';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface Customer { name: string; phone: string; email: string; address: string; jobCount: number; totalSpent: number; lastJob: string; avgRating: number; firstSeen: string; tags: string[] }

export default function CustomersPage() {
  const { db, cfg } = useData();
  const { toast } = useToast();
  const currency = cfg.currency || 'ILS';
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Build customer database from jobs + leads
  const customers: Customer[] = useMemo(() => {
    const map: Record<string, Customer> = {};
    // From jobs
    (db.jobs || []).forEach((j: any) => {
      const key = j.phone || j.client || '';
      if (!key) return;
      if (!map[key]) map[key] = { name: j.client || '', phone: j.phone || '', email: j.email || '', address: j.address || '', jobCount: 0, totalSpent: 0, lastJob: '', avgRating: 0, firstSeen: j.created || '', tags: [] };
      map[key].jobCount++;
      map[key].totalSpent += j.revenue || 0;
      if (!map[key].lastJob || (j.created || '') > map[key].lastJob) { map[key].lastJob = j.created || ''; map[key].address = j.address || map[key].address; }
      if (!map[key].name && j.client) map[key].name = j.client;
      if (!map[key].email && j.email) map[key].email = j.email;
    });
    // From leads
    (db.leads || []).forEach((l: any) => {
      const key = l.phone || l.name || '';
      if (!key || map[key]) return;
      map[key] = { name: l.name || '', phone: l.phone || '', email: l.email || '', address: l.address || '', jobCount: 0, totalSpent: 0, lastJob: '', avgRating: 0, firstSeen: l.created || '', tags: l.status === 'converted' ? ['הומר מליד'] : ['ליד'] };
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [db.jobs, db.leads]);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
  }, [customers, search]);

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const activeCustomers = customers.filter(c => c.jobCount > 0).length;
  const repeatCustomers = customers.filter(c => c.jobCount > 1).length;

  // Customer job history
  const customerJobs = useMemo(() => {
    if (!selectedCustomer) return [];
    return (db.jobs || []).filter((j: any) => j.phone === selectedCustomer.phone || j.client === selectedCustomer.name)
      .sort((a: any, b: any) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [selectedCustomer, db.jobs]);

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="מאגר לקוחות" subtitle={`${customers.length} לקוחות`} />

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
        {[
          { label: 'סה״כ לקוחות', value: customers.length, color: '#3B82F6', icon: '👥' },
          { label: 'לקוחות פעילים', value: activeCustomers, color: '#10B981', icon: '✅' },
          { label: 'לקוחות חוזרים', value: repeatCustomers, color: '#8B5CF6', icon: '🔄' },
          { label: 'הכנסה כוללת', value: formatCurrency(totalRevenue, currency), color: '#F59E0B', icon: '💰' },
        ].map((s, i) => (
          <Box key={i} sx={{ p: 2, borderRadius: 2, bgcolor: `${s.color}08`, border: `1px solid ${s.color}20`, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <Typography sx={{ fontSize: 16 }}>{s.icon}</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField placeholder="חיפוש לקוח..." value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#5a7080' }} /></InputAdornment> }} />
      </Box>

      {filtered.length === 0 ? (
        <EmptyState icon="👥" title="אין לקוחות" subtitle="לקוחות ייווצרו אוטומטית מעבודות ולידים" />
      ) : (
        <Box sx={{ bgcolor: c.surface2 || '#0f1318', border: `1px solid ${c.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable keyExtractor={(cust: Customer) => cust.phone || cust.name} data={filtered} onRowClick={(cust: Customer) => setSelectedCustomer(cust)} columns={[
            { key: 'name', label: 'לקוח', render: (cust: Customer) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#3B82F6', fontSize: 12 }}>{cust.name[0] || '?'}</Avatar>
                <Box><Typography sx={{ fontWeight: 600, fontSize: 12 }}>{cust.name}</Typography><Typography sx={{ fontSize: 10, color: c.text3 }}>{cust.phone}</Typography></Box>
              </Box>
            )},
            { key: 'email', label: 'אימייל', render: (cust: Customer) => cust.email || '—' },
            { key: 'address', label: 'כתובת', render: (cust: Customer) => cust.address || '—' },
            { key: 'jobs', label: 'עבודות', render: (cust: Customer) => (
              <Chip label={cust.jobCount} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: cust.jobCount > 2 ? '#10B98115' : 'transparent', color: cust.jobCount > 2 ? '#10B981' : c.text2 }} />
            )},
            { key: 'spent', label: 'שילם', render: (cust: Customer) => (
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>{formatCurrency(cust.totalSpent, currency)}</Typography>
            )},
            { key: 'last', label: 'אחרון', render: (cust: Customer) => cust.lastJob ? formatDate(cust.lastJob) : '—' },
          ]} />
        </Box>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={Boolean(selectedCustomer)} onClose={() => setSelectedCustomer(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, direction: 'rtl' } }}>
        {selectedCustomer && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: '#3B82F6', fontSize: 20 }}>{selectedCustomer.name[0]}</Avatar>
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{selectedCustomer.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: c.text3 }}>{selectedCustomer.phone} · {selectedCustomer.email}</Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* Customer Stats */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper sx={{ p: 2, flex: 1, borderRadius: 2, textAlign: 'center', border: `1px solid ${c.border}` }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#3B82F6' }}>{selectedCustomer.jobCount}</Typography>
                  <Typography sx={{ fontSize: 11, color: c.text3 }}>עבודות</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, borderRadius: 2, textAlign: 'center', border: `1px solid ${c.border}` }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#10B981' }}>{formatCurrency(selectedCustomer.totalSpent, currency)}</Typography>
                  <Typography sx={{ fontSize: 11, color: c.text3 }}>שילם</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, borderRadius: 2, textAlign: 'center', border: `1px solid ${c.border}` }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#F59E0B' }}>{selectedCustomer.firstSeen ? formatDate(selectedCustomer.firstSeen) : '—'}</Typography>
                  <Typography sx={{ fontSize: 11, color: c.text3 }}>לקוח מאז</Typography>
                </Paper>
              </Box>

              {/* Job History */}
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>📋 היסטוריית עבודות</Typography>
              {customerJobs.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: c.text3 }}>אין עבודות</Typography>
              ) : customerJobs.map((j: any) => (
                <Box key={j.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 'none' } }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: j.status === 'completed' ? '#10B981' : j.status === 'cancelled' ? '#EF4444' : '#3B82F6' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{j.num || '#' + j.id} — {j.desc || j.address || 'עבודה'}</Typography>
                    <Typography sx={{ fontSize: 10, color: c.text3 }}>{formatDate(j.created)} · {j.tech || 'לא שובץ'}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>{j.revenue ? formatCurrency(j.revenue, currency) : '—'}</Typography>
                </Box>
              ))}
            </DialogContent>
            <DialogActions><Button onClick={() => setSelectedCustomer(null)}>סגור</Button></DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
