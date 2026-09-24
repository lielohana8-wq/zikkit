'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, IconButton, Chip, InputAdornment, Autocomplete } from '@mui/material';
import { Add, ChevronLeft, ChevronRight, Delete, Download, Edit } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, weekRange, toDateKey, round2 } from '../useSolo';
import { Stat, SelectField, PAYMENT_METHODS, PAID_TO, paidToLabel, paymentLabel, CustomerPicker, type CustomerPickerValue } from '../components/SoloUI';
import { SplitEditor, SplitBreakdown, SplitChip, type SplitValue } from '../components/SplitFields';
import { computeSplit, splitOf, OWN_SOURCE } from '../split';
import type { Closing, PaidTo, PaymentMethod } from '@/types';

/**
 * Closings — the log of closed deals: where the money went, and how much of it
 * is actually ours once the company that sent the job takes its cut.
 */
interface Draft { id?: number; date: string; customer: CustomerPickerValue; jobType: string; amount: number; deposit: number; depositPaidTo: PaidTo; balancePaidTo: PaidTo; paymentMethod: PaymentMethod | ''; materials: number; notes: string; quoteId?: number; receiptId?: number; created?: string; split: SplitValue }

const DEFAULT_JOB_TYPES = ['Chimney sweep', 'Chimney repair', 'Chimney cap / liner', 'Garage door spring', 'Garage door opener', 'Garage door install', 'Inspection', 'Service call', 'Other'];

export default function SoloClosings() {
  const { closings: allClosings, customers, currency, saveClosing, deleteItem, ensureCustomer, role, uid, technicians, sources, sourceRates, defaults } = useSolo();
  const isTech = role === 'technician';
  const seesSplit = !isTech;
  const [techFilter, setTechFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const closings = useMemo(() => allClosings.filter((x) => (!techFilter || x.techUid === techFilter) && (!sourceFilter || (sourceFilter === OWN_SOURCE ? !x.source : x.source === sourceFilter))), [allClosings, techFilter, sourceFilter]);
  const { toast } = useToast();
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'week' | 'all'>('week');

  const { start, end } = weekRange(anchor);
  const startKey = toDateKey(start), endKey = toDateKey(end);
  const weekList = useMemo(() => closings.filter((x) => x.date >= startKey && x.date <= endKey), [closings, startKey, endKey]);
  const list = view === 'week' ? weekList : closings;

  const totals = useMemo(() => {
    const t = { amount: 0, company: 0, cash: 0, me: 0, unpaid: 0, materials: 0, ourShare: 0, companyCut: 0 };
    const bySource = new Map<string, { amount: number; ourShare: number; count: number }>();
    for (const x of weekList) {
      t.amount += Number(x.amount) || 0; t.materials += Number(x.materials) || 0;
      const sp = splitOf(x);
      t.ourShare += sp.ourShare; t.companyCut += sp.companyShare;
      const key = x.source || OWN_SOURCE;
      const cur = bySource.get(key) || { amount: 0, ourShare: 0, count: 0 };
      cur.amount += sp.gross; cur.ourShare += sp.ourShare; cur.count += 1; bySource.set(key, cur);
      const dep = Number(x.deposit) || 0; const bal = Number(x.balance) || 0;
      const add = (to: PaidTo | undefined, amt: number) => { if (!amt) return; if (to === 'company') t.company += amt; else if (to === 'cash') t.cash += amt; else if (to === 'me') t.me += amt; else t.unpaid += amt; };
      add(x.depositPaidTo, dep); add(x.balancePaidTo, bal);
    }
    return { ...t, bySource: Array.from(bySource.entries()).sort((a, b) => b[1].amount - a[1].amount) };
  }, [weekList]);

  const jobTypes = useMemo(() => Array.from(new Set([...closings.map((x) => x.jobType).filter(Boolean), ...DEFAULT_JOB_TYPES])), [closings]);

  const newDraft = (): Draft => ({ date: toDateKey(new Date()), customer: { name: '' }, jobType: '', amount: 0, deposit: 0, depositPaidTo: 'company', balancePaidTo: 'none', paymentMethod: 'etransfer', materials: 0, notes: '', split: { source: OWN_SOURCE, sharePercent: defaults.sharePercent, materialsBeforeSplit: defaults.materialsBeforeSplit } });
  const fromClosing = (x: Closing): Draft => ({ id: x.id, date: x.date, customer: { customerId: x.customerId, name: x.client, phone: x.phone, address: x.address }, jobType: x.jobType, amount: x.amount, deposit: x.deposit || 0, depositPaidTo: x.depositPaidTo || 'company', balancePaidTo: x.balancePaidTo || 'none', paymentMethod: x.paymentMethod || '', materials: x.materials || 0, notes: x.notes || '', quoteId: x.quoteId, receiptId: x.receiptId, created: x.created, split: { source: x.source || OWN_SOURCE, sharePercent: x.sharePercent ?? defaults.sharePercent, materialsBeforeSplit: x.materialsBeforeSplit ?? defaults.materialsBeforeSplit } });

  const save = async () => {
    if (!draft) return;
    if (!draft.customer.name.trim()) { toast('Customer name is required', '#ff4d6d'); return; }
    if (!draft.amount) { toast('Enter the closed amount', '#ff4d6d'); return; }
    setSaving(true);
    try {
      const cust = await ensureCustomer(draft.customer.name, draft.customer.phone, draft.customer.email, draft.customer.address);
      const amount = round2(Number(draft.amount) || 0); const deposit = round2(Number(draft.deposit) || 0);
      const balance = round2(Math.max(0, amount - deposit));
      const prev = draft.id != null ? allClosings.find((c0) => c0.id === draft.id) : undefined;
      const sp = computeSplit({ amount, materials: Number(draft.materials) || 0, sharePercent: draft.split.sharePercent, materialsBeforeSplit: draft.split.materialsBeforeSplit });
      const x: Closing = {
        ...(prev || {}),
        id: draft.id ?? newId(), date: draft.date, customerId: cust?.id, client: draft.customer.name.trim(), phone: cust?.phone || draft.customer.phone, address: draft.customer.address,
        jobType: draft.jobType.trim() || 'Job', amount, deposit, depositPaidTo: draft.depositPaidTo, balance, balancePaidTo: draft.balancePaidTo,
        paymentMethod: draft.paymentMethod || undefined, materials: round2(Number(draft.materials) || 0), notes: draft.notes,
        source: draft.split.source === OWN_SOURCE ? '' : draft.split.source, sharePercent: sp.sharePercent, materialsBeforeSplit: draft.split.materialsBeforeSplit, ourShare: sp.ourShare, companyShare: sp.companyShare,
        quoteId: draft.quoteId, receiptId: draft.receiptId, techUid: prev?.techUid || uid || undefined, techName: prev?.techName, createdBy: prev?.createdBy || uid || undefined, status: draft.balancePaidTo === 'none' && balance > 0 ? 'open' : 'done', created: draft.created || new Date().toISOString(),
      };
      await saveClosing(x); setDraft(null); toast('Closing saved');
    } catch { /* provider toasts */ }
    finally { setSaving(false); }
  };

  const exportCsv = () => {
    const rows = [['Date', 'Customer', 'Phone', 'Job', 'Technician', 'Source', 'Our %', 'Amount', 'Materials', 'Our share', 'Company share', 'Deposit', 'Deposit to', 'Balance', 'Balance to', 'Method', 'Notes']];
    for (const x of list) {
      const sp = splitOf(x);
      rows.push([x.date, x.client, x.phone || '', x.jobType, x.techName || '', x.source || 'My own', String(sp.sharePercent), String(x.amount), String(x.materials || 0), String(sp.ourShare), String(sp.companyShare), String(x.deposit || 0), paidToLabel(x.depositPaidTo), String(x.balance || 0), paidToLabel(x.balancePaidTo), paymentLabel(x.paymentMethod), (x.notes || '').replace(/\n/g, ' ')]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = view === 'week' ? `closings-${startKey}-to-${endKey}.csv` : 'closings-all.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  const shift = (days: number) => { const d = new Date(anchor); d.setDate(d.getDate() + days); setAnchor(d); };
  const weekLabel = `${start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Box className="zk-fade-up">
      <SectionHeader title={isTech ? 'My closings' : 'Closings'} subtitle={isTech ? 'Jobs you closed. Week runs Monday → Sunday.' : 'Closed deals and where the money went. Week runs Monday → Sunday.'} actions={isTech ? undefined : <><Button startIcon={<Download />} onClick={exportCsv} disabled={list.length === 0}>CSV</Button><Button variant="contained" startIcon={<Add />} onClick={() => setDraft(newDraft())}>Log closing</Button></>} />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label="This week" onClick={() => { setView('week'); setAnchor(new Date()); }} color={view === 'week' ? 'primary' : 'default'} variant={view === 'week' ? 'filled' : 'outlined'} size="small" />
        <Chip label="All" onClick={() => setView('all')} color={view === 'all' ? 'primary' : 'default'} variant={view === 'all' ? 'filled' : 'outlined'} size="small" />
        {view === 'week' && <><IconButton size="small" onClick={() => shift(-7)}><ChevronLeft /></IconButton><Typography sx={{ fontWeight: 700, fontSize: 13 }}>{weekLabel}</Typography><IconButton size="small" onClick={() => shift(7)}><ChevronRight /></IconButton></>}
      </Stack>
      {!isTech && (technicians.length > 0 || sources.length > 0) && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip label="Everyone" size="small" onClick={() => { setTechFilter(''); setSourceFilter(''); }} color={!techFilter && !sourceFilter ? 'primary' : 'default'} variant={!techFilter && !sourceFilter ? 'filled' : 'outlined'} />
          {technicians.filter((t) => t.uid).map((t) => <Chip key={t.uid} label={`👷 ${t.name}`} size="small" onClick={() => setTechFilter(t.uid as string)} color={techFilter === t.uid ? 'primary' : 'default'} variant={techFilter === t.uid ? 'filled' : 'outlined'} />)}
          {sources.length > 0 && <Chip label={OWN_SOURCE} size="small" onClick={() => setSourceFilter(OWN_SOURCE)} color={sourceFilter === OWN_SOURCE ? 'primary' : 'default'} variant={sourceFilter === OWN_SOURCE ? 'filled' : 'outlined'} />}
          {sources.map((src) => <Chip key={src} label={src} size="small" onClick={() => setSourceFilter(src)} color={sourceFilter === src ? 'primary' : 'default'} variant={sourceFilter === src ? 'filled' : 'outlined'} />)}
        </Stack>
      )}

      {view === 'week' && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
          <Stat label="Closed this week" value={formatMoney(totals.amount, currency)} sub={`${weekList.length} deal${weekList.length === 1 ? '' : 's'}`} color={c.accent} />
          {seesSplit && <Stat label="Our share" value={formatMoney(totals.ourShare, currency)} sub={totals.companyCut > 0 ? `${formatMoney(totals.companyCut, currency)} to other companies` : 'no splits this week'} color="#059669" />}
          <Stat label="Paid to company" value={formatMoney(totals.company, currency)} />
          <Stat label="Cash with me" value={formatMoney(totals.cash, currency)} color="#D97706" />
          <Stat label="e-Transfer to me" value={formatMoney(totals.me, currency)} color="#059669" />
          <Stat label="Not collected yet" value={formatMoney(totals.unpaid, currency)} color="#DC2626" />
          {totals.materials > 0 && <Stat label="Materials" value={formatMoney(totals.materials, currency)} />}
        </Stack>
      )}

      {seesSplit && view === 'week' && totals.bySource.length > 1 && (
        <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}`, mb: 2.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Where the work came from</Typography>
          {totals.bySource.map(([src, v]) => (
            <Stack key={src} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.6, borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 0 } }}>
              <Typography sx={{ fontSize: 13 }}>{src} · {v.count} job{v.count === 1 ? '' : 's'}</Typography>
              <Typography sx={{ fontSize: 13 }}>{formatMoney(v.amount, currency)} → <b style={{ color: '#059669' }}>{formatMoney(v.ourShare, currency)}</b></Typography>
            </Stack>
          ))}
        </Paper>
      )}

      {list.length === 0 ? (
        <EmptyState icon="✅" title={view === 'week' ? 'Nothing closed this week yet' : 'No closings yet'} subtitle={isTech ? 'Close a job from "My jobs" and it shows up here.' : 'Log a deal the moment you close it — takes 20 seconds.'} actionLabel={isTech ? undefined : 'Log closing'} onAction={isTech ? undefined : () => setDraft(newDraft())} />
      ) : (
        <Stack spacing={1}>
          {list.map((x) => (
            <Paper key={x.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${c.border}` }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0, cursor: isTech ? 'default' : 'pointer' }} onClick={() => !isTech && setDraft(fromClosing(x))}>
                  <Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ fontWeight: 800, fontSize: 14 }}>{x.client}</Typography><Chip size="small" label={x.jobType} sx={{ height: 20, fontSize: 10 }} />{seesSplit && <SplitChip source={x.source} sharePercent={x.sharePercent} />}{x.status === 'open' && <Chip size="small" label="Balance open" color="warning" sx={{ height: 20, fontSize: 10 }} />}</Stack>
                  <Typography sx={{ fontSize: 12, color: c.text3 }}>{formatDateLocal(x.date)}{!isTech && x.techName ? ` · 👷 ${x.techName}` : ''} · Deposit {formatMoney(x.deposit || 0, currency)} → {paidToLabel(x.depositPaidTo)} · Balance {formatMoney(x.balance || 0, currency)} → {paidToLabel(x.balancePaidTo)}{x.paymentMethod ? ` · ${paymentLabel(x.paymentMethod)}` : ''}</Typography>
                  {x.notes && <Typography sx={{ fontSize: 12, color: c.text2, mt: 0.3 }}>{x.notes}</Typography>}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, whiteSpace: 'nowrap' }}>{formatMoney(x.amount, currency)}</Typography>
                  {seesSplit && (x.source || (x.materials || 0) > 0) && <Typography sx={{ fontSize: 11, color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>ours {formatMoney(splitOf(x).ourShare, currency)}</Typography>}
                </Box>
                {!isTech && <IconButton size="small" onClick={() => setDraft(fromClosing(x))}><Edit fontSize="small" /></IconButton>}
                {!isTech && <IconButton size="small" color="error" onClick={() => { if (confirm('Delete this closing?')) deleteItem('closings', x.id); }}><Delete fontSize="small" /></IconButton>}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>{draft?.id ? 'Edit closing' : 'Log a closing'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1.5}>
                <TextField type="date" label="Date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
                <Autocomplete freeSolo options={jobTypes} value={draft.jobType} onInputChange={(_, v) => setDraft({ ...draft, jobType: v })} sx={{ flex: 1 }} renderInput={(p) => <TextField {...p} label="Job type" />} />
              </Stack>
              <CustomerPicker customers={customers} value={draft.customer} onChange={(customer) => setDraft({ ...draft, customer })} />
              <Stack direction="row" spacing={1.5}>
                <TextField type="number" label="Closed amount" value={draft.amount || ''} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth autoFocus />
                <TextField type="number" label="Materials (optional)" value={draft.materials || ''} onChange={(e) => setDraft({ ...draft, materials: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
              </Stack>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: c.surface2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
                  <TextField size="small" type="number" label="Deposit" value={draft.deposit || ''} onChange={(e) => setDraft({ ...draft, deposit: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
                  <SelectField label="Deposit paid to" value={draft.depositPaidTo} onChange={(v) => setDraft({ ...draft, depositPaidTo: v })} options={PAID_TO} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap', minWidth: 130 }}>Balance <b>{formatMoney(Math.max(0, (draft.amount || 0) - (draft.deposit || 0)), currency)}</b></Typography>
                  <SelectField label="Balance paid to" value={draft.balancePaidTo} onChange={(v) => setDraft({ ...draft, balancePaidTo: v })} options={PAID_TO} />
                  <SelectField label="Method" value={draft.paymentMethod} onChange={(v) => setDraft({ ...draft, paymentMethod: v })} options={PAYMENT_METHODS} />
                </Stack>
              </Paper>
              {seesSplit && (
                <>
                  <SplitEditor value={draft.split} onChange={(split) => setDraft({ ...draft, split })} rates={sourceRates} compact />
                  <SplitBreakdown amount={draft.amount || 0} materials={draft.materials || 0} split={draft.split} currency={currency} dense />
                </>
              )}
              <TextField label="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} multiline minRows={2} fullWidth placeholder="Anything worth remembering about this deal" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save closing'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
