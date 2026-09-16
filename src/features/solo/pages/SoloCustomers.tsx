'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Chip, IconButton, Divider } from '@mui/material';
import { Search, Add, Edit, Phone, Email, LocationOn, Delete, WhatsApp } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal, REGION_DEFAULTS } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { useSolo } from '../useSolo';
import { StatusChip } from '../components/SoloUI';
import type { Customer } from '@/types';

const empty = (): Partial<Customer> => ({ name: '', phone: '', email: '', address: '', city: '', province: 'ON', postal: '', notes: '', tags: [] });

export default function SoloCustomers() {
  const { customers, quotes, receipts, closings, currency, upsertCustomer, deleteItem } = useSolo();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((x) => [x.name, x.phone, x.email, x.address, x.city].some((v) => (v || '').toLowerCase().includes(q)));
  }, [customers, search]);

  const stats = useMemo(() => {
    const byCustomer = new Map<number, { spent: number; closings: number; lastDate: string }>();
    for (const cl of closings) {
      if (cl.customerId == null) continue;
      const cur = byCustomer.get(cl.customerId) || { spent: 0, closings: 0, lastDate: '' };
      cur.spent += Number(cl.amount) || 0; cur.closings += 1; if (cl.date > cur.lastDate) cur.lastDate = cl.date;
      byCustomer.set(cl.customerId, cur);
    }
    return byCustomer;
  }, [closings]);

  const save = async () => {
    if (!editing?.name?.trim()) { toast('Name is required', '#ff4d6d'); return; }
    setSaving(true);
    try { await upsertCustomer(editing as Customer & { name: string }); toast(editing.id ? 'Customer updated' : 'Customer added'); setEditing(null); }
    catch (e) { /* toast shown by provider */ }
    finally { setSaving(false); }
  };

  const remove = async (cust: Customer) => {
    if (!confirm(`Delete ${cust.name}? Quotes, receipts and closings stay.`)) return;
    await deleteItem('customers', cust.id); setSelected(null); toast('Customer deleted');
  };

  const selQuotes = selected ? quotes.filter((q) => q.customerId === selected.id) : [];
  const selReceipts = selected ? receipts.filter((r) => r.customerId === selected.id) : [];
  const selClosings = selected ? closings.filter((r) => r.customerId === selected.id) : [];

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Customers" subtitle={`${customers.length} total`} actions={<Button variant="contained" startIcon={<Add />} onClick={() => setEditing(empty())}>New customer</Button>} />
      <TextField fullWidth size="small" placeholder="Search name, phone, email, address…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />

      {customers.length === 0 ? (
        <EmptyState icon="🧑" title="No customers yet" subtitle="Add your first customer, or create a quote — customers are added automatically." actionLabel="Add customer" onAction={() => setEditing(empty())} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1.5 }}>
          {list.map((cust) => {
            const st = stats.get(cust.id);
            return (
              <Paper key={cust.id} onClick={() => setSelected(cust)} sx={{ p: 2, borderRadius: 3, cursor: 'pointer', border: `1px solid ${c.border}`, '&:hover': { borderColor: c.accent } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{cust.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: c.text3 }}>{cust.phone || '—'}{cust.email ? ` · ${cust.email}` : ''}</Typography>
                    {(cust.address || cust.city) && <Typography sx={{ fontSize: 12, color: c.text3 }}>{[cust.address, cust.city].filter(Boolean).join(', ')}</Typography>}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{formatMoney(st?.spent || 0, currency)}</Typography>
                    <Typography sx={{ fontSize: 11, color: c.text3 }}>{st?.closings || 0} closing{(st?.closings || 0) === 1 ? '' : 's'}</Typography>
                  </Box>
                </Stack>
                {cust.tags && cust.tags.length > 0 && <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>{cust.tags.map((t) => <Chip key={t} label={t} size="small" />)}</Stack>}
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Detail */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        {selected && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>{selected.name}<Typography sx={{ fontSize: 12, color: c.text3 }}>Customer since {formatDateLocal(selected.created)}</Typography></Box>
                <Stack direction="row">
                  <IconButton onClick={() => { setEditing({ ...selected }); setSelected(null); }}><Edit /></IconButton>
                  <IconButton color="error" onClick={() => remove(selected)}><Delete /></IconButton>
                </Stack>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                {selected.phone && <Stack direction="row" spacing={1} alignItems="center"><Phone fontSize="small" /><Typography component="a" href={`tel:${selected.phone}`} sx={{ fontSize: 14 }}>{selected.phone}</Typography><IconButton size="small" href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank"><WhatsApp fontSize="small" /></IconButton></Stack>}
                {selected.email && <Stack direction="row" spacing={1} alignItems="center"><Email fontSize="small" /><Typography component="a" href={`mailto:${selected.email}`} sx={{ fontSize: 14 }}>{selected.email}</Typography></Stack>}
                {(selected.address || selected.city) && <Stack direction="row" spacing={1} alignItems="center"><LocationOn fontSize="small" /><Typography sx={{ fontSize: 14 }}>{[selected.address, selected.city, selected.province, selected.postal].filter(Boolean).join(', ')}</Typography></Stack>}
                {selected.notes && <Typography sx={{ fontSize: 13, color: c.text2, whiteSpace: 'pre-wrap', mt: 1 }}>{selected.notes}</Typography>}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>Closings ({selClosings.length}) · {formatMoney(selClosings.reduce((s, x) => s + (Number(x.amount) || 0), 0), currency)}</Typography>
              {selClosings.slice(0, 8).map((x) => <Row key={x.id} left={`${formatDateLocal(x.date)} · ${x.jobType}`} right={formatMoney(x.amount, currency)} />)}
              <Typography sx={{ fontWeight: 700, fontSize: 13, mt: 1.5, mb: 0.5 }}>Quotes ({selQuotes.length})</Typography>
              {selQuotes.slice(0, 8).map((q) => <Row key={q.id} left={`${q.number || 'Q-' + q.id} · ${formatDateLocal(q.created)}`} right={<><StatusChip status={q.status} /> <b>{formatMoney(q.total, currency)}</b></>} />)}
              <Typography sx={{ fontWeight: 700, fontSize: 13, mt: 1.5, mb: 0.5 }}>Receipts ({selReceipts.length})</Typography>
              {selReceipts.slice(0, 8).map((r) => <Row key={r.id} left={`${r.number} · ${formatDateLocal(r.created)}`} right={<><StatusChip status={r.status} /> <b>{formatMoney(r.total, currency)}</b></>} />)}
            </DialogContent>
            <DialogActions><Button onClick={() => setSelected(null)}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.id ? 'Edit customer' : 'New customer'}</DialogTitle>
        <DialogContent>
          {editing && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField label="Name" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required autoFocus fullWidth />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Phone" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} fullWidth placeholder="(416) 555-0199" />
                <TextField label="Email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} fullWidth />
              </Stack>
              <TextField label="Street address" value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} fullWidth />
              <Stack direction="row" spacing={1.5}>
                <TextField label="City" value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} fullWidth />
                <TextField label={REGION_DEFAULTS.provinceLabel} value={editing.province || ''} onChange={(e) => setEditing({ ...editing, province: e.target.value })} sx={{ width: 110 }} />
                <TextField label={REGION_DEFAULTS.postalLabel} value={editing.postal || ''} onChange={(e) => setEditing({ ...editing, postal: e.target.value.toUpperCase() })} sx={{ width: 140 }} />
              </Stack>
              <TextField label="Tags (comma separated)" value={(editing.tags || []).join(', ')} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} fullWidth placeholder="repeat, referral, VIP" />
              <TextField label="Notes" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} fullWidth multiline minRows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Row({ left, right }: { left: string; right: React.ReactNode }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: `1px solid ${c.border}` }}><Typography sx={{ fontSize: 13 }}>{left}</Typography><Typography component="div" sx={{ fontSize: 13 }}>{right}</Typography></Stack>;
}
