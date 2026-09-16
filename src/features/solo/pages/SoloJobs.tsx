'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Chip, IconButton, Menu, MenuItem, Divider, Autocomplete } from '@mui/material';
import { Add, MoreVert, Delete, Edit, CheckCircle, Cancel, Navigation, Phone, PlayArrow, DirectionsCar } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, toDateKey } from '../useSolo';
import { StatusChip, CustomerPicker, SelectField, type CustomerPickerValue } from '../components/SoloUI';
import { CloseJobDialog } from '../components/CloseJobDialog';
import type { Job, JobStatus } from '@/types';

const JOB_STATUSES: Array<{ value: JobStatus; label: string }> = [
  { value: 'scheduled', label: 'Scheduled' }, { value: 'on_way', label: 'On the way' }, { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label]));
const DEFAULT_JOB_TYPES = ['Chimney sweep', 'Chimney repair', 'Chimney cap / liner', 'Garage door spring', 'Garage door opener', 'Garage door install', 'Inspection', 'Service call', 'Other'];

interface Draft { id?: number; customer: CustomerPickerValue; jobType: string; date: string; time: string; duration: number; techUid: string; notes: string; quoteId?: number; quoteTotal?: number; status: JobStatus; created?: string }

const dayLabel = (key: string) => {
  const today = toDateKey(new Date()); const t = new Date(); t.setDate(t.getDate() + 1); const tomorrow = toDateKey(t);
  if (key === today) return 'Today'; if (key === tomorrow) return 'Tomorrow';
  return new Date(key + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function SoloJobs() {
  const { jobs, customers, quotes, technicians, currency, role, uid, saveJob, deleteItem, ensureCustomer, saveQuote } = useSolo();
  const { toast } = useToast();
  const isTech = role === 'technician';
  const [view, setView] = useState<'upcoming' | 'today' | 'done' | 'all'>('upcoming');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [closing, setClosing] = useState<Job | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; j: Job } | null>(null);
  const [saving, setSaving] = useState(false);

  const today = toDateKey(new Date());
  const list = useMemo(() => jobs.filter((j) => {
    const done = j.status === 'completed' || j.status === 'cancelled';
    if (view === 'today') return (j.scheduledDate || '') === today && !done;
    if (view === 'done') return done;
    if (view === 'all') return true;
    return !done && (j.scheduledDate || '9999') >= today;
  }), [jobs, view, today]);

  const grouped = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of list) { const k = j.scheduledDate || 'unscheduled'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(j); }
    return Array.from(m.entries()).sort((a, b) => (view === 'done' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])));
  }, [list, view]);

  const jobTypes = useMemo(() => Array.from(new Set([...jobs.map((x) => x.jobType || '').filter(Boolean), ...DEFAULT_JOB_TYPES])), [jobs]);
  const acceptedQuotes = useMemo(() => quotes.filter((q) => (q.status === 'accepted' || q.status === 'approved') && !jobs.some((j) => j.quoteId === q.id)), [quotes, jobs]);

  const newDraft = (): Draft => ({ customer: { name: '' }, jobType: '', date: today, time: '09:00', duration: 60, techUid: '', notes: '', status: 'scheduled' });
  const fromJob = (j: Job): Draft => ({ id: j.id, customer: { customerId: j.customerId, name: j.client, phone: j.phone, email: j.email, address: j.address }, jobType: j.jobType || j.desc || '', date: j.scheduledDate || today, time: j.scheduledTime || '09:00', duration: j.duration || 60, techUid: j.techUid || '', notes: j.notes || '', quoteId: j.quoteId, quoteTotal: j.quoteTotal, status: j.status, created: j.created });
  const fromQuote = (qid: number) => {
    const q = quotes.find((x) => x.id === qid); if (!q || !draft) return;
    setDraft({ ...draft, customer: { customerId: q.customerId, name: q.client, phone: q.phone, email: q.email, address: q.address }, jobType: draft.jobType || q.items?.[0]?.name || '', quoteId: q.id, quoteTotal: q.total, notes: draft.notes || q.notes || '' });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.customer.name.trim()) { toast('Customer is required', '#ff4d6d'); return; }
    if (!draft.date) { toast('Pick a date', '#ff4d6d'); return; }
    setSaving(true);
    try {
      const cust = await ensureCustomer(draft.customer.name, draft.customer.phone, draft.customer.email, draft.customer.address);
      const tech = technicians.find((t) => t.uid === draft.techUid);
      const job: Job = {
        id: draft.id ?? newId(), client: draft.customer.name.trim(), phone: cust?.phone || draft.customer.phone, email: draft.customer.email, address: draft.customer.address,
        customerId: cust?.id, jobType: draft.jobType.trim() || 'Job', desc: draft.jobType.trim() || 'Job', status: draft.status,
        scheduledDate: draft.date, scheduledTime: draft.time, duration: draft.duration, techUid: draft.techUid || undefined, tech: tech?.name || undefined,
        notes: draft.notes, quoteId: draft.quoteId, quoteTotal: draft.quoteTotal, createdBy: uid || undefined, created: draft.created || new Date().toISOString(),
      };
      await saveJob(job);
      if (draft.quoteId && !draft.id) { const q = quotes.find((x) => x.id === draft.quoteId); if (q) await saveQuote({ ...q, jobId: job.id }); }
      setDraft(null); toast(draft.id ? 'Job updated' : 'Job scheduled');
    } catch { /* provider toasts */ }
    finally { setSaving(false); }
  };

  const setStatus = async (j: Job, status: JobStatus) => {
    const patch: Partial<Job> = { status };
    if (status === 'in_progress') patch.startedAt = new Date().toISOString();
    await saveJob({ ...j, ...patch }); toast(STATUS_LABEL[status] || status);
  };
  const assign = async (j: Job, techUid: string) => { const t = technicians.find((x) => x.uid === techUid); await saveJob({ ...j, techUid: techUid || undefined, tech: t?.name || undefined }); toast(t ? `Assigned to ${t.name}` : 'Unassigned'); };

  const mapsUrl = (addr?: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr || '')}`;

  return (
    <Box className="zk-fade-up">
      <SectionHeader title={isTech ? 'My jobs' : 'Jobs'} subtitle={`${list.length} ${view === 'done' ? 'finished' : 'scheduled'}`} actions={!isTech ? <Button variant="contained" startIcon={<Add />} onClick={() => setDraft(newDraft())}>New job</Button> : undefined} />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {([['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Done'], ['all', 'All']] as const).map(([v, l]) => <Chip key={v} label={l} onClick={() => setView(v)} color={view === v ? 'primary' : 'default'} variant={view === v ? 'filled' : 'outlined'} size="small" />)}
      </Stack>

      {!isTech && acceptedQuotes.length > 0 && view !== 'done' && (
        <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${c.border}`, mb: 2, bgcolor: 'rgba(16,185,129,0.06)' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12, mb: 0.5 }}>Accepted quotes waiting to be scheduled</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {acceptedQuotes.slice(0, 6).map((q) => <Chip key={q.id} label={`${q.number || 'Q-' + q.id} · ${q.client} · ${formatMoney(q.total, currency)}`} onClick={() => { setDraft(newDraft()); setTimeout(() => setDraft((d) => d ? { ...d, customer: { customerId: q.customerId, name: q.client, phone: q.phone, email: q.email, address: q.address }, jobType: q.items?.[0]?.name || '', quoteId: q.id, quoteTotal: q.total, notes: q.notes || '' } : d), 0); }} size="small" />)}
          </Stack>
        </Paper>
      )}

      {list.length === 0 ? (
        <EmptyState icon="🔧" title={isTech ? 'No jobs assigned yet' : 'No jobs here'} subtitle={isTech ? 'When the office assigns you a job it shows up here.' : 'Schedule a job from an accepted quote or from scratch.'} actionLabel={!isTech ? 'New job' : undefined} onAction={!isTech ? () => setDraft(newDraft()) : undefined} />
      ) : grouped.map(([day, dayJobs]) => (
        <Box key={day} sx={{ mb: 2.5 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 13, color: day === today ? c.accent : c.text2, mb: 1 }}>{day === 'unscheduled' ? 'Unscheduled' : dayLabel(day)}{day !== 'unscheduled' && day !== today ? ` · ${formatDateLocal(day)}` : ''}</Typography>
          <Stack spacing={1}>
            {dayJobs.map((j) => (
              <Paper key={j.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${c.border}`, opacity: j.status === 'cancelled' ? 0.55 : 1 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Box sx={{ minWidth: 52, textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 15 }}>{j.scheduledTime || '—'}</Typography>
                    <Typography sx={{ fontSize: 10, color: c.text3 }}>{j.duration ? `${j.duration}m` : ''}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => !isTech && setDraft(fromJob(j))} style={{ cursor: isTech ? 'default' : 'pointer' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}><Typography sx={{ fontWeight: 800, fontSize: 14 }}>{j.client}</Typography><Chip size="small" label={STATUS_LABEL[j.status] || j.status} sx={{ height: 20, fontSize: 10 }} color={j.status === 'completed' ? 'success' : j.status === 'in_progress' || j.status === 'on_way' ? 'primary' : 'default'} />{j.quoteTotal ? <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatMoney(j.quoteTotal, currency)}</Typography> : null}</Stack>
                    <Typography sx={{ fontSize: 13, color: c.text2 }}>{j.jobType || j.desc}{j.address ? ` · ${j.address}` : ''}</Typography>
                    <Typography sx={{ fontSize: 11, color: c.text3 }}>{!isTech ? (j.tech ? `👷 ${j.tech}` : '⚠️ Unassigned') : ''}{j.notes ? ` · ${j.notes}` : ''}</Typography>
                  </Box>
                  {j.phone && <IconButton size="small" href={`tel:${j.phone}`}><Phone fontSize="small" /></IconButton>}
                  {j.address && <IconButton size="small" href={mapsUrl(j.address)} target="_blank"><Navigation fontSize="small" /></IconButton>}
                  {!isTech && <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, j })}><MoreVert /></IconButton>}
                </Stack>
                {j.status !== 'completed' && j.status !== 'cancelled' && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
                    {j.status === 'scheduled' && <Button size="small" variant="outlined" startIcon={<DirectionsCar />} onClick={() => setStatus(j, 'on_way')}>On my way</Button>}
                    {(j.status === 'scheduled' || j.status === 'on_way') && <Button size="small" variant="outlined" startIcon={<PlayArrow />} onClick={() => setStatus(j, 'in_progress')}>Start</Button>}
                    <Button size="small" variant="contained" startIcon={<CheckCircle />} onClick={() => setClosing(j)}>Close job</Button>
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}

      {/* Staff menu */}
      <Menu open={!!menu} anchorEl={menu?.el} onClose={() => setMenu(null)}>
        {menu && [
          <MenuItem key="edit" onClick={() => { setDraft(fromJob(menu.j)); setMenu(null); }}><Edit fontSize="small" sx={{ mr: 1 }} />Edit</MenuItem>,
          <Divider key="d0" />,
          ...technicians.map((t) => <MenuItem key={t.uid || t.id} disabled={!t.uid} onClick={() => { assign(menu.j, t.uid!); setMenu(null); }}>👷 {t.name}{!t.uid ? ' (not joined yet)' : ''}{menu.j.techUid === t.uid ? ' ✓' : ''}</MenuItem>),
          <MenuItem key="unassign" onClick={() => { assign(menu.j, ''); setMenu(null); }}>Unassign</MenuItem>,
          <Divider key="d1" />,
          <MenuItem key="cancel" onClick={() => { setStatus(menu.j, 'cancelled'); setMenu(null); }}><Cancel fontSize="small" sx={{ mr: 1 }} />Cancel job</MenuItem>,
          <MenuItem key="del" onClick={() => { if (confirm('Delete this job?')) deleteItem('jobs', menu.j.id); setMenu(null); }} sx={{ color: 'error.main' }}><Delete fontSize="small" sx={{ mr: 1 }} />Delete</MenuItem>,
        ]}
      </Menu>

      {/* Editor (staff) */}
      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>{draft?.id ? 'Edit job' : 'New job'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {!draft.id && acceptedQuotes.length > 0 && <SelectField label="From accepted quote (optional)" value={(draft.quoteId ? String(draft.quoteId) : '') as string} onChange={(v) => fromQuote(Number(v))} options={acceptedQuotes.map((q) => ({ value: String(q.id), label: `${q.number || 'Q-' + q.id} · ${q.client} · ${formatMoney(q.total, currency)}` }))} />}
              <CustomerPicker customers={customers} value={draft.customer} onChange={(customer) => setDraft({ ...draft, customer })} />
              <Autocomplete freeSolo options={jobTypes} value={draft.jobType} onInputChange={(_, v) => setDraft({ ...draft, jobType: v })} renderInput={(p) => <TextField {...p} label="Job type" />} />
              <Stack direction="row" spacing={1.5}>
                <TextField type="date" label="Date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                <TextField type="time" label="Time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
                <TextField type="number" label="Minutes" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} sx={{ width: 110 }} />
              </Stack>
              <SelectField label="Technician" value={draft.techUid} onChange={(v) => setDraft({ ...draft, techUid: v })} options={[{ value: '', label: 'Unassigned' }, ...technicians.filter((t) => t.uid).map((t) => ({ value: t.uid as string, label: t.name }))]} />
              {technicians.some((t) => !t.uid) && <Typography sx={{ fontSize: 11, color: c.text3, mt: -1 }}>Technicians who haven't accepted their invite yet can't be assigned.</Typography>}
              {draft.id && <SelectField label="Status" value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={JOB_STATUSES} />}
              <TextField label="Notes for the technician" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : draft?.id ? 'Save' : 'Schedule job'}</Button>
        </DialogActions>
      </Dialog>

      {closing && <CloseJobDialog job={closing} onClose={() => setClosing(null)} />}
    </Box>
  );
}
