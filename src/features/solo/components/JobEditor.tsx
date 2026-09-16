'use client';
import { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Autocomplete, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, toDateKey } from '../useSolo';
import { CustomerPicker, SelectField, type CustomerPickerValue } from './SoloUI';
import type { Job, JobStatus } from '@/types';

export const JOB_STATUSES: Array<{ value: JobStatus; label: string }> = [
  { value: 'scheduled', label: 'Scheduled' }, { value: 'on_way', label: 'On the way' }, { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
];
export const JOB_STATUS_LABEL: Record<string, string> = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label]));
const DEFAULT_JOB_TYPES = ['Chimney sweep', 'Chimney repair', 'Chimney cap / liner', 'Garage door spring', 'Garage door opener', 'Garage door install', 'Inspection', 'Service call', 'Other'];

export interface JobPreset { date?: string; time?: string; techUid?: string; quoteId?: number }
interface Draft { customer: CustomerPickerValue; jobType: string; date: string; time: string; duration: number; techUid: string; notes: string; quoteId?: number; quoteTotal?: number; status: JobStatus }

/** Create / edit a job. Shared by the Jobs list and the Schedule. */
export function JobEditorDialog({ job, preset, onClose, onSaved }: { job?: Job; preset?: JobPreset; onClose: () => void; onSaved?: (job: Job) => void }) {
  const { jobs, customers, quotes, technicians, currency, uid, saveJob, ensureCustomer, saveQuote } = useSolo();
  const { toast } = useToast();
  const today = toDateKey(new Date());
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => {
    if (job) return { customer: { customerId: job.customerId, name: job.client, phone: job.phone, email: job.email, address: job.address }, jobType: job.jobType || job.desc || '', date: job.scheduledDate || today, time: job.scheduledTime || '09:00', duration: job.duration || 60, techUid: job.techUid || '', notes: job.notes || '', quoteId: job.quoteId, quoteTotal: job.quoteTotal, status: job.status };
    const q = preset?.quoteId ? quotes.find((x) => x.id === preset.quoteId) : undefined;
    return { customer: q ? { customerId: q.customerId, name: q.client, phone: q.phone, email: q.email, address: q.address } : { name: '' }, jobType: q?.items?.[0]?.name || '', date: preset?.date || today, time: preset?.time || '09:00', duration: 60, techUid: preset?.techUid || '', notes: q?.notes || '', quoteId: q?.id, quoteTotal: q?.total, status: 'scheduled' };
  });

  const jobTypes = useMemo(() => Array.from(new Set([...jobs.map((x) => x.jobType || '').filter(Boolean), ...DEFAULT_JOB_TYPES])), [jobs]);
  const acceptedQuotes = useMemo(() => quotes.filter((q) => (q.status === 'accepted' || q.status === 'approved') && !jobs.some((j) => j.quoteId === q.id && j.id !== job?.id)), [quotes, jobs, job?.id]);
  const joined = technicians.filter((t) => t.uid);

  const fromQuote = (qid: number) => {
    const q = quotes.find((x) => x.id === qid); if (!q) return;
    setDraft((d) => ({ ...d, customer: { customerId: q.customerId, name: q.client, phone: q.phone, email: q.email, address: q.address }, jobType: d.jobType || q.items?.[0]?.name || '', quoteId: q.id, quoteTotal: q.total, notes: d.notes || q.notes || '' }));
  };

  const save = async () => {
    if (!draft.customer.name.trim()) { toast('Customer is required', '#ff4d6d'); return; }
    if (!draft.date) { toast('Pick a date', '#ff4d6d'); return; }
    setSaving(true);
    try {
      const cust = await ensureCustomer(draft.customer.name, draft.customer.phone, draft.customer.email, draft.customer.address);
      const tech = joined.find((t) => t.uid === draft.techUid);
      const next: Job = {
        ...(job || {}),
        id: job?.id ?? newId(), client: draft.customer.name.trim(), phone: cust?.phone || draft.customer.phone, email: draft.customer.email, address: draft.customer.address,
        customerId: cust?.id, jobType: draft.jobType.trim() || 'Job', desc: draft.jobType.trim() || 'Job', status: draft.status,
        scheduledDate: draft.date, scheduledTime: draft.time, duration: draft.duration, techUid: draft.techUid || undefined, tech: tech?.name || undefined,
        notes: draft.notes, quoteId: draft.quoteId, quoteTotal: draft.quoteTotal, createdBy: job?.createdBy || uid || undefined, created: job?.created || new Date().toISOString(),
      };
      await saveJob(next);
      if (draft.quoteId && !job) { const q = quotes.find((x) => x.id === draft.quoteId); if (q) await saveQuote({ ...q, jobId: next.id }); }
      toast(job ? 'Job updated' : 'Job scheduled'); onSaved?.(next); onClose();
    } catch { /* provider toasts */ }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{job ? 'Edit job' : 'New job'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!job && acceptedQuotes.length > 0 && <SelectField label="From accepted quote (optional)" value={(draft.quoteId ? String(draft.quoteId) : '') as string} onChange={(v) => fromQuote(Number(v))} options={acceptedQuotes.map((q) => ({ value: String(q.id), label: `${q.number || 'Q-' + q.id} · ${q.client} · ${formatMoney(q.total, currency)}` }))} />}
          <CustomerPicker customers={customers} value={draft.customer} onChange={(customer) => setDraft({ ...draft, customer })} />
          <Autocomplete freeSolo options={jobTypes} value={draft.jobType} onInputChange={(_, v) => setDraft({ ...draft, jobType: v })} renderInput={(p) => <TextField {...p} label="Job type" />} />
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" label="Date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField type="time" label="Time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
            <TextField type="number" label="Minutes" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} sx={{ width: 110 }} />
          </Stack>
          <SelectField label="Technician" value={draft.techUid} onChange={(v) => setDraft({ ...draft, techUid: v })} options={[{ value: '', label: 'Unassigned' }, ...joined.map((t) => ({ value: t.uid as string, label: t.name }))]} />
          {technicians.some((t) => !t.uid) && <Typography sx={{ fontSize: 11, color: c.text3, mt: -1 }}>Technicians who haven't accepted their invite yet can't be assigned.</Typography>}
          {job && <SelectField label="Status" value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={JOB_STATUSES} />}
          <TextField label="Notes for the technician" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} multiline minRows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : job ? 'Save' : 'Schedule job'}</Button>
      </DialogActions>
    </Dialog>
  );
}
