'use client';
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, InputAdornment, Paper, Typography, Box } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, round2, toDateKey } from '../useSolo';
import { isFieldRole } from '../roles';
import { SelectField, PAYMENT_METHODS, PAID_TO } from './SoloUI';
import { SplitEditor, SplitBreakdown, type SplitValue } from './SplitFields';
import { computeSplit, OWN_SOURCE } from '../split';
import type { Job, Closing, PaidTo, PaymentMethod } from '@/types';

/**
 * Close a job → creates the Closing (who closed it = the job's technician),
 * marks the job completed. Used by technicians (their own jobs) and by staff.
 */
export function CloseJobDialog({ job, onClose, onClosed }: { job: Job; onClose: () => void; onClosed?: (closing: Closing) => void }) {
  const { currency, saveClosing, saveJob, uid, user, role, assignees, assigneeOf, sources, sourceRates, defaults } = useSolo();
  const seesSplit = !isFieldRole(role);
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(job.quoteTotal || job.revenue || 0);
  const [deposit, setDeposit] = useState<number>(0);
  const [depositPaidTo, setDepositPaidTo] = useState<PaidTo>('company');
  const [balancePaidTo, setBalancePaidTo] = useState<PaidTo>('company');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('etransfer');
  const [materials, setMaterials] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // The split follows the job; settings only supply the default for jobs that never set one.
  const [split, setSplit] = useState<SplitValue>(() => ({
    source: job.source || OWN_SOURCE,
    sharePercent: job.sharePercent ?? defaults.sharePercent,
    materialsBeforeSplit: job.materialsBeforeSplit ?? defaults.materialsBeforeSplit,
  }));

  const balance = round2(Math.max(0, (amount || 0) - (deposit || 0)));

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1280; const scale = Math.min(1, max / Math.max(img.width, img.height));
          const cv = document.createElement('canvas'); cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
          cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
          setPhotos((p) => [...p, cv.toDataURL('image/jpeg', 0.75)]); // uploaded to Storage by the data layer
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const submit = async () => {
    if (!amount) { toast('Enter the closed amount', '#ff4d6d'); return; }
    setSaving(true);
    try {
      // Whoever the job belongs to owns the closing; a field user can only close their own.
      const techUid = role === 'technician' || role === 'partner' ? (uid || undefined) : (job.techUid || uid || undefined);
      const who = assigneeOf(techUid);
      const techName = who?.name || job.tech || user?.name || '';
      const assigneeRole = who?.role || job.assigneeRole || (role === 'owner' ? 'owner' : role === 'partner' ? 'partner' : 'technician');
      const s = computeSplit({ amount, materials, sharePercent: split.sharePercent, materialsBeforeSplit: split.materialsBeforeSplit });
      const closing: Closing = {
        id: newId(), date: toDateKey(new Date()), customerId: job.customerId, client: job.client, phone: job.phone, address: job.address,
        jobType: job.jobType || job.desc || 'Job', amount: round2(amount), deposit: round2(deposit || 0), depositPaidTo, balance, balancePaidTo,
        paymentMethod: paymentMethod || undefined, materials: round2(materials || 0), notes, jobId: job.id, quoteId: job.quoteId,
        source: split.source === OWN_SOURCE ? '' : split.source, sharePercent: s.sharePercent, materialsBeforeSplit: split.materialsBeforeSplit,
        ourShare: s.ourShare, companyShare: s.companyShare,
        techUid, techName, assigneeRole, photos, createdBy: uid || undefined, status: balancePaidTo === 'none' && balance > 0 ? 'open' : 'done', created: new Date().toISOString(),
      };
      await saveClosing(closing);
      await saveJob({ ...job, status: 'completed', completedAt: new Date().toISOString(), closingId: closing.id, revenue: closing.amount });
      toast('Job closed');
      onClosed?.(closing); onClose();
    } catch { /* provider toasts */ }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Close job — {job.client}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: 13, color: c.text3 }}>{job.jobType || job.desc}{job.address ? ` · ${job.address}` : ''}</Typography>
          <Stack direction="row" spacing={1.5}>
            <TextField type="number" label="Closed amount" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth autoFocus />
            <TextField type="number" label="Materials (optional)" value={materials || ''} onChange={(e) => setMaterials(Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
          </Stack>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: c.surface2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
              <TextField size="small" type="number" label="Deposit" value={deposit || ''} onChange={(e) => setDeposit(Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
              <SelectField label="Deposit paid to" value={depositPaidTo} onChange={setDepositPaidTo} options={PAID_TO} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap', minWidth: 130 }}>Balance <b>{formatMoney(balance, currency)}</b></Typography>
              <SelectField label="Balance paid to" value={balancePaidTo} onChange={setBalancePaidTo} options={PAID_TO} />
              <SelectField label="Method" value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} />
            </Stack>
          </Paper>
          {seesSplit && (
            <Stack spacing={1.25}>
              <SplitEditor value={split} onChange={setSplit} rates={sourceRates} compact />
              <SplitBreakdown amount={amount} materials={materials} split={split} currency={currency} dense />
            </Stack>
          )}
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth placeholder="What was done, anything to remember" />
          <Box>
            <Button component="label" variant="outlined" size="small">📷 Add photos<input hidden type="file" accept="image/*" multiple capture="environment" onChange={addPhoto} /></Button>
            {photos.length > 0 && <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>{photos.map((p, i) => <Box key={i} component="img" src={p} sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1.5, border: `1px solid ${c.border}` }} onClick={() => setPhotos(photos.filter((_, x) => x !== i))} />)}</Stack>}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? 'Saving…' : `Close job · ${formatMoney(amount || 0, currency)}`}</Button>
      </DialogActions>
    </Dialog>
  );
}
