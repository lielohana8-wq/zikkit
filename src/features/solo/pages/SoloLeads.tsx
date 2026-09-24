'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, TextField, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem, Divider, InputAdornment } from '@mui/material';
import { Add, Phone, WhatsApp, MoreVert, Delete, Edit, Description, Event, Search } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal, normalizePhone } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, toDateKey } from '../useSolo';
import { isOffice } from '../roles';
import { SelectField } from '../components/SoloUI';
import type { Lead, LeadStatus } from '@/types';

/**
 * Leads — the calls that haven't become a quote yet.
 * A lead is the cheapest thing in the app: name, phone, what they need.
 * Everything else (quote, job, closing) grows out of it.
 */
const STATUSES: Array<{ value: LeadStatus; label: string; color: string }> = [
  { value: 'new', label: 'New', color: '#2563EB' },
  { value: 'contacted', label: 'Contacted', color: '#7C3AED' },
  { value: 'hot', label: 'Hot', color: '#DC2626' },
  { value: 'warm', label: 'Quoted', color: '#D97706' },
  { value: 'converted', label: 'Won', color: '#059669' },
  { value: 'lost', label: 'Lost', color: '#6B7280' },
];
const STATUS = Object.fromEntries(STATUSES.map((s) => [s.value, s]));
const SOURCES = [
  { value: 'phone', label: 'Phone call' }, { value: 'referral', label: 'Referral' }, { value: 'web', label: 'Website' },
  { value: 'walk_in', label: 'Repeat customer' }, { value: 'manual', label: 'Other' },
];

interface Draft { id?: number; name: string; phone: string; email: string; address: string; desc: string; status: LeadStatus; source: string; value: number; followUpDate: string; notes: string; created?: string }

export default function SoloLeads() {
  const { leads, saveLead, deleteItem, ensureCustomer, currency, role } = useSolo();
  /** The office role only ever touches leads — it cannot open customers, quotes or jobs. */
  const officeOnly = isOffice(role);
  const { toast } = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<'open' | 'all' | LeadStatus>('open');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; l: Lead } | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter === 'open' && (l.status === 'converted' || l.status === 'lost')) return false;
      if (filter !== 'open' && filter !== 'all' && l.status !== filter) return false;
      if (q && ![l.name, l.phone, l.address, l.desc].some((v) => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [leads, filter, search]);

  const open = leads.filter((l) => l.status !== 'converted' && l.status !== 'lost');
  const pipeline = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const today = toDateKey(new Date());
  const dueToday = open.filter((l) => l.followUpDate && l.followUpDate <= today);

  const newDraft = (): Draft => ({ name: '', phone: '', email: '', address: '', desc: '', status: 'new', source: 'phone', value: 0, followUpDate: '', notes: '' });
  const fromLead = (l: Lead): Draft => ({ id: l.id, name: l.name, phone: l.phone || '', email: l.email || '', address: l.address || '', desc: l.desc || '', status: l.status, source: String(l.source || 'phone'), value: l.value || 0, followUpDate: l.followUpDate || '', notes: l.notes || '', created: l.created });

  const save = async () => {
    if (!draft?.name.trim()) { toast('Name is required', '#ff4d6d'); return; }
    setSaving(true);
    try {
      const l: Lead = {
        id: draft.id ?? newId(), name: draft.name.trim(), phone: normalizePhone(draft.phone), email: draft.email || undefined,
        address: draft.address || undefined, desc: draft.desc || undefined, status: draft.status,
        source: draft.source as Lead['source'], value: Number(draft.value) || undefined,
        followUpDate: draft.followUpDate || undefined, notes: draft.notes || undefined,
        created: draft.created || new Date().toISOString(),
      };
      await saveLead(l); setDraft(null); toast(draft.id ? 'Lead updated' : 'Lead added');
    } catch { /* provider toasts */ }
    finally { setSaving(false); }
  };

  const setStatus = async (l: Lead, status: LeadStatus) => { await saveLead({ ...l, status }); toast(STATUS[status]?.label || status); };

  /** Turn a lead into a customer and open the quote builder pre-filled. */
  const toQuote = async (l: Lead) => {
    const cust = await ensureCustomer(l.name, l.phone, l.email, l.address);
    await saveLead({ ...l, status: l.status === 'new' || l.status === 'contacted' ? 'warm' : l.status });
    router.push(`/quotes?newFor=${cust?.id ?? ''}`);
  };
  const toJob = async (l: Lead) => {
    const cust = await ensureCustomer(l.name, l.phone, l.email, l.address);
    await saveLead({ ...l, status: 'converted' });
    router.push(`/jobs?newFor=${cust?.id ?? ''}`);
  };

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Leads" subtitle={officeOnly ? `${open.length} open · write down every call` : `${open.length} open${pipeline > 0 ? ` · ${formatMoney(pipeline, currency)} potential` : ''}`} actions={<Button variant="contained" startIcon={<Add />} onClick={() => setDraft(newDraft())}>New lead</Button>} />

      {dueToday.length > 0 && (
        <Paper sx={{ p: 1.75, borderRadius: 3, mb: 2, border: '1px solid #D97706', bgcolor: 'rgba(217,119,6,0.07)' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 0.5 }}>Follow up today</Typography>
          {dueToday.map((l) => (
            <Stack key={l.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.4 }}>
              <Typography sx={{ fontSize: 13, flex: 1 }}>{l.name}{l.desc ? ` — ${l.desc}` : ''}</Typography>
              {l.phone && <IconButton size="small" href={`tel:${l.phone}`}><Phone fontSize="small" /></IconButton>}
              <Button size="small" onClick={() => setDraft(fromLead(l))}>Open</Button>
            </Stack>
          ))}
        </Paper>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <TextField size="small" placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 180 }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        <Chip label="Open" size="small" onClick={() => setFilter('open')} color={filter === 'open' ? 'primary' : 'default'} variant={filter === 'open' ? 'filled' : 'outlined'} />
        {STATUSES.map((s) => <Chip key={s.value} label={s.label} size="small" onClick={() => setFilter(s.value)} color={filter === s.value ? 'primary' : 'default'} variant={filter === s.value ? 'filled' : 'outlined'} />)}
        <Chip label="All" size="small" onClick={() => setFilter('all')} color={filter === 'all' ? 'primary' : 'default'} variant={filter === 'all' ? 'filled' : 'outlined'} />
      </Stack>

      {list.length === 0 ? (
        <EmptyState icon="📞" title={leads.length === 0 ? 'No leads yet' : 'Nothing here'} subtitle="Log the call the moment it comes in — name and phone is enough. Turn it into a quote when you're ready." actionLabel="New lead" onAction={() => setDraft(newDraft())} />
      ) : (
        <Stack spacing={1}>
          {list.map((l) => {
            const st = STATUS[l.status] || STATUSES[0];
            return (
              <Paper key={l.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${c.border}`, borderLeft: `4px solid ${st.color}` }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDraft(fromLead(l))}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{l.name}</Typography>
                      <Chip size="small" label={st.label} sx={{ height: 20, fontSize: 10, bgcolor: `${st.color}1A`, color: st.color, fontWeight: 700 }} />
                      {l.value ? <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatMoney(l.value, currency)}</Typography> : null}
                    </Stack>
                    <Typography sx={{ fontSize: 13, color: c.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc || '—'}{l.address ? ` · ${l.address}` : ''}</Typography>
                    <Typography sx={{ fontSize: 11, color: c.text3 }}>{l.phone || 'no phone'}{l.created ? ` · ${formatDateLocal(l.created)}` : ''}{l.followUpDate ? ` · follow up ${formatDateLocal(l.followUpDate)}` : ''}</Typography>
                  </Box>
                  {l.phone && <IconButton size="small" href={`tel:${l.phone}`}><Phone fontSize="small" /></IconButton>}
                  {l.phone && <IconButton size="small" href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><WhatsApp fontSize="small" /></IconButton>}
                  <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, l })}><MoreVert /></IconButton>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Menu open={!!menu} anchorEl={menu?.el} onClose={() => setMenu(null)}>
        {menu && [
          ...(officeOnly ? [] : [
            <MenuItem key="quote" onClick={() => { const l = menu.l; setMenu(null); toQuote(l); }}><Description fontSize="small" sx={{ mr: 1 }} />Create quote</MenuItem>,
            <MenuItem key="job" onClick={() => { const l = menu.l; setMenu(null); toJob(l); }}><Event fontSize="small" sx={{ mr: 1 }} />Book a job</MenuItem>,
          ]),
          <MenuItem key="edit" onClick={() => { setDraft(fromLead(menu.l)); setMenu(null); }}><Edit fontSize="small" sx={{ mr: 1 }} />Edit</MenuItem>,
          <Divider key="d" />,
          ...STATUSES.map((s) => <MenuItem key={s.value} onClick={() => { setStatus(menu.l, s.value); setMenu(null); }} disabled={menu.l.status === s.value}>{s.label}</MenuItem>),
          <Divider key="d2" />,
          <MenuItem key="del" onClick={() => { if (confirm('Delete this lead?')) deleteItem('leads', menu.l.id); setMenu(null); }} sx={{ color: 'error.main' }}><Delete fontSize="small" sx={{ mr: 1 }} />Delete</MenuItem>,
        ]}
      </Menu>

      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="xs">
        <DialogTitle>{draft?.id ? 'Edit lead' : 'New lead'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} fullWidth autoFocus />
              <Stack direction="row" spacing={1.5}>
                <TextField label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} fullWidth />
                <TextField label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} fullWidth />
              </Stack>
              <TextField label="Address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} fullWidth />
              <TextField label="What do they need?" value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} fullWidth multiline minRows={2} placeholder="Chimney sweep + cap, garage door won't close…" />
              <Stack direction="row" spacing={1.5}>
                <SelectField label="Status" value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={STATUSES.map((s) => ({ value: s.value, label: s.label }))} size="medium" />
                <SelectField label="Came from" value={draft.source} onChange={(v) => setDraft({ ...draft, source: v })} options={SOURCES} size="medium" />
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <TextField label="Worth about" type="number" value={draft.value || ''} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
                <TextField label="Follow up on" type="date" value={draft.followUpDate} onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              </Stack>
              <TextField label="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} fullWidth multiline minRows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          {draft?.id && !officeOnly && <Button onClick={() => { const l = leads.find((x) => x.id === draft.id); if (l) { setDraft(null); toQuote(l); } }}>Create quote</Button>}
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
