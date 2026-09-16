'use client';
import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Chip, IconButton, Menu, MenuItem, Divider, Switch, FormControlLabel, InputAdornment } from '@mui/material';
import { Add, MoreVert, Send, Delete, Edit, Paid } from '@mui/icons-material';
import { useSearchParams } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, computeTotals, round2 } from '../useSolo';
import { StatusChip, CustomerPicker, LineItemsEditor, ShareDialog, SelectField, PAYMENT_METHODS, paymentLabel, type CustomerPickerValue, type LineItem } from '../components/SoloUI';
import type { Receipt, PaymentMethod } from '@/types';

interface Draft { id?: number; number?: string; customer: CustomerPickerValue; items: LineItem[]; discount: number; taxOn: boolean; taxRate: number; notes: string; amountPaid: number; paymentMethod: PaymentMethod | ''; paidAt: string; quoteId?: number; closingId?: number; portalToken?: string; created?: string }

const today = () => new Date().toISOString().slice(0, 10);

export default function SoloReceipts() {
  const { receipts, customers, currency, taxRate, taxLabel, cfg, db, saveReceipt, deleteItem, ensureCustomer, publish, nextDocNumber } = useSolo();
  const { toast } = useToast();
  const params = useSearchParams();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState<{ el: HTMLElement; r: Receipt } | null>(null);
  const [share, setShare] = useState<{ r: Receipt; url: string; token: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const catalog = useMemo(() => ((db.products || []) as Array<{ name: string; price: number }>).filter((p) => p?.name), [db.products]);

  const fromReceipt = (r: Receipt): Draft => ({ id: r.id, number: r.number, customer: { customerId: r.customerId, name: r.client, phone: r.phone, email: r.email, address: r.address }, items: (r.items || []).map((it) => ({ ...it })), discount: r.discount || 0, taxOn: (r.taxRate ?? 0) > 0, taxRate: r.taxRate ?? taxRate, notes: r.notes || '', amountPaid: r.amountPaid || 0, paymentMethod: r.paymentMethod || '', paidAt: (r.paidAt || r.created || '').slice(0, 10) || today(), quoteId: r.quoteId, closingId: r.closingId, portalToken: r.portalToken, created: r.created });

  // Deep link from quotes page: /receipts?open=<id>
  useEffect(() => {
    const open = params?.get('open');
    if (!open) return;
    const r = receipts.find((x) => String(x.id) === open);
    if (r && !draft) setDraft(fromReceipt(r));
  }, [params, receipts]); // eslint-disable-line react-hooks/exhaustive-deps

  const newDraft = (): Draft => ({ customer: { name: '' }, items: [{ id: Date.now(), name: '', qty: 1, price: 0 }], discount: 0, taxOn: taxRate > 0, taxRate, notes: '', amountPaid: 0, paymentMethod: 'etransfer', paidAt: today() });
  const totals = draft ? computeTotals(draft.items, draft.discount, draft.taxOn ? draft.taxRate : 0) : null;

  const list = useMemo(() => receipts.filter((r) => filter === 'all' ? true : filter === 'paid' ? r.status === 'paid' : r.status !== 'paid'), [receipts, filter]);
  const outstanding = useMemo(() => receipts.reduce((s, r) => s + (r.balance || 0), 0), [receipts]);
  const collected = useMemo(() => receipts.reduce((s, r) => s + (r.amountPaid || 0), 0), [receipts]);

  const persist = async (): Promise<Receipt | null> => {
    if (!draft) return null;
    if (!draft.customer.name.trim()) { toast('Customer name is required', '#ff4d6d'); return null; }
    setSaving(true);
    try {
      const cust = await ensureCustomer(draft.customer.name, draft.customer.phone, draft.customer.email, draft.customer.address);
      const number = draft.number || (await nextDocNumber('receipt'));
      const items = draft.items.filter((it) => it.name.trim()).map((it) => ({ id: it.id, name: it.name.trim(), qty: Number(it.qty) || 0, price: Number(it.price) || 0 }));
      const t = computeTotals(items, draft.discount, draft.taxOn ? draft.taxRate : 0);
      const paid = round2(Number(draft.amountPaid) || 0);
      const balance = round2(Math.max(0, t.total - paid));
      const status: Receipt['status'] = paid <= 0 ? 'unpaid' : balance > 0 ? 'partial' : 'paid';
      const r: Receipt = {
        id: draft.id ?? newId(), number, customerId: cust?.id, client: draft.customer.name.trim(), phone: cust?.phone || draft.customer.phone, email: draft.customer.email, address: draft.customer.address,
        items, subtotal: t.subtotal, discount: draft.discount || 0, taxRate: draft.taxOn ? draft.taxRate : 0, taxLabel, tax: t.tax, total: t.total,
        amountPaid: paid, balance, status, paymentMethod: draft.paymentMethod || undefined, paidAt: paid > 0 ? new Date(draft.paidAt || today()).toISOString() : undefined,
        notes: draft.notes, quoteId: draft.quoteId, closingId: draft.closingId, currency, portalToken: draft.portalToken, created: draft.created || new Date().toISOString(),
      };
      await saveReceipt(r);
      if (r.portalToken) { try { await publish('receipt', r); } catch {} }
      return r;
    } catch { return null; }
    finally { setSaving(false); }
  };

  const save = async () => { const r = await persist(); if (r) { setDraft(null); toast(`Receipt ${r.number} saved`); } };
  const sendReceipt = async (existing?: Receipt) => {
    const r = existing || (await persist());
    if (!r) return;
    try {
      const { token, url } = await publish('receipt', r);
      const updated = { ...r, portalToken: token };
      await saveReceipt(updated);
      setDraft(null);
      setShare({ r: updated, url, token });
    } catch (e) { toast('Could not create link: ' + ((e as Error)?.message || ''), '#ff4d6d'); }
  };
  const markPaid = async (r: Receipt) => {
    const updated: Receipt = { ...r, amountPaid: r.total, balance: 0, status: 'paid', paidAt: r.paidAt || new Date().toISOString(), paymentMethod: r.paymentMethod || 'etransfer' };
    await saveReceipt(updated); if (updated.portalToken) { try { await publish('receipt', updated); } catch {} }
    toast(`${r.number} marked paid`);
  };

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Receipts" subtitle={`${formatMoney(collected, currency)} collected · ${formatMoney(outstanding, currency)} outstanding`} actions={<Button variant="contained" startIcon={<Add />} onClick={() => setDraft(newDraft())}>New receipt</Button>} />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {(['all', 'paid', 'unpaid'] as const).map((f) => <Chip key={f} label={f === 'unpaid' ? 'Unpaid / partial' : f.charAt(0).toUpperCase() + f.slice(1)} onClick={() => setFilter(f)} color={filter === f ? 'primary' : 'default'} variant={filter === f ? 'filled' : 'outlined'} size="small" />)}
      </Stack>

      {receipts.length === 0 ? (
        <EmptyState icon="🧾" title="No receipts yet" subtitle="Create one from an accepted quote, or start from scratch." actionLabel="New receipt" onAction={() => setDraft(newDraft())} />
      ) : (
        <Stack spacing={1}>
          {list.map((r) => (
            <Paper key={r.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${c.border}` }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDraft(fromReceipt(r))}>
                  <Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ fontWeight: 800, fontSize: 14 }}>{r.number}</Typography><StatusChip status={r.status} /></Stack>
                  <Typography sx={{ fontSize: 13, color: c.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.client}{r.paymentMethod ? ` · ${paymentLabel(r.paymentMethod)}` : ''}</Typography>
                  <Typography sx={{ fontSize: 11, color: c.text3 }}>{formatDateLocal(r.paidAt || r.created)}{r.balance > 0 ? ` · balance ${formatMoney(r.balance, currency)}` : ''}</Typography>
                </Box>
                <Typography sx={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap' }}>{formatMoney(r.total, currency)}</Typography>
                <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, r })}><MoreVert /></IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Menu open={!!menu} anchorEl={menu?.el} onClose={() => setMenu(null)}>
        {menu && [
          <MenuItem key="send" onClick={() => { const r = menu.r; setMenu(null); sendReceipt(r); }}><Send fontSize="small" sx={{ mr: 1 }} />{menu.r.portalToken ? 'Share link again' : 'Send'}</MenuItem>,
          <MenuItem key="edit" onClick={() => { setDraft(fromReceipt(menu.r)); setMenu(null); }}><Edit fontSize="small" sx={{ mr: 1 }} />Edit</MenuItem>,
          <MenuItem key="paid" onClick={() => { markPaid(menu.r); setMenu(null); }} disabled={menu.r.status === 'paid'}><Paid fontSize="small" sx={{ mr: 1 }} />Mark paid in full</MenuItem>,
          <Divider key="d" />,
          <MenuItem key="del" onClick={() => { if (confirm('Delete this receipt?')) deleteItem('receipts', menu.r.id); setMenu(null); }} sx={{ color: 'error.main' }}><Delete fontSize="small" sx={{ mr: 1 }} />Delete</MenuItem>,
        ]}
      </Menu>

      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="md">
        <DialogTitle>{draft?.number ? `Receipt ${draft.number}` : 'New receipt'}</DialogTitle>
        <DialogContent>
          {draft && totals && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <CustomerPicker customers={customers} value={draft.customer} onChange={(customer) => setDraft({ ...draft, customer })} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Items</Typography>
                <LineItemsEditor items={draft.items} onChange={(items) => setDraft({ ...draft, items })} currency={currency} catalog={catalog} />
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <TextField size="small" type="number" label="Discount" value={draft.discount} onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ width: 140 }} />
                <FormControlLabel control={<Switch checked={draft.taxOn} onChange={(e) => setDraft({ ...draft, taxOn: e.target.checked })} />} label={`${taxLabel} ${draft.taxRate}%`} />
              </Stack>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: c.surface2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
                  <TextField size="small" type="number" label="Amount paid" value={draft.amountPaid} onChange={(e) => setDraft({ ...draft, amountPaid: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
                  <Button size="small" onClick={() => setDraft({ ...draft, amountPaid: totals.total })} sx={{ whiteSpace: 'nowrap' }}>Paid in full</Button>
                  <SelectField label="Method" value={draft.paymentMethod} onChange={(v) => setDraft({ ...draft, paymentMethod: v })} options={PAYMENT_METHODS} />
                  <TextField size="small" type="date" label="Paid on" value={draft.paidAt} onChange={(e) => setDraft({ ...draft, paidAt: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                </Stack>
                <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
                {draft.discount > 0 && <Row label="Discount" value={'-' + formatMoney(draft.discount, currency)} />}
                {draft.taxOn && <Row label={`${taxLabel} (${draft.taxRate}%)`} value={formatMoney(totals.tax, currency)} />}
                <Row label="Total" value={formatMoney(totals.total, currency)} bold />
                <Row label="Balance due" value={formatMoney(Math.max(0, totals.total - (Number(draft.amountPaid) || 0)), currency)} bold />
              </Paper>
              <TextField label="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={save} disabled={saving}>Save</Button>
          <Button variant="contained" startIcon={<Send />} onClick={() => sendReceipt()} disabled={saving}>{saving ? 'Working…' : 'Save & send'}</Button>
        </DialogActions>
      </Dialog>

      {share && <ShareDialog open onClose={() => setShare(null)} url={share.url} token={share.token} kind="receipt" number={share.r.number} to={{ phone: share.r.phone, email: share.r.email, name: share.r.client }} bizName={cfg.biz_name || 'us'} />}
    </Box>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}><Typography sx={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 900 : 500 }}>{label}</Typography><Typography sx={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 900 : 600 }}>{value}</Typography></Stack>;
}
