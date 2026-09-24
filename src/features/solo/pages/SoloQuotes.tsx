'use client';
import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Chip, IconButton, Menu, MenuItem, Divider, Switch, FormControlLabel, InputAdornment } from '@mui/material';
import { Add, MoreVert, Send, ContentCopy, Receipt as ReceiptIcon, Delete, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo, computeTotals } from '../useSolo';
import { StatusChip, CustomerPicker, LineItemsEditor, ShareDialog, type CustomerPickerValue, type LineItem } from '../components/SoloUI';
import type { Quote } from '@/types';

type Filter = 'all' | 'draft' | 'sent' | 'accepted' | 'declined';

interface Draft { id?: number; number?: string; customer: CustomerPickerValue; items: LineItem[]; discount: number; taxOn: boolean; taxRate: number; notes: string; validDays: number; status?: Quote['status']; portalToken?: string; created?: string }

export default function SoloQuotes() {
  const solo = useSolo();
  const { quotes, customers, currency, taxRate, taxLabel, cfg, db, saveQuote, deleteItem, ensureCustomer, publish, nextDocNumber, receiptFromQuote, saveReceipt } = solo;
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState<{ el: HTMLElement; q: Quote } | null>(null);
  const [share, setShare] = useState<{ q: Quote; url: string; token: string } | null>(null);

  const catalog = useMemo(() => ((db.products || []) as Array<{ name: string; price: number }>).filter((p) => p?.name), [db.products]);

  const list = useMemo(() => quotes.filter((q) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return q.status === 'sent' || q.status === 'viewed';
    if (filter === 'accepted') return q.status === 'accepted' || q.status === 'approved';
    return q.status === filter;
  }), [quotes, filter]);

  const openValue = useMemo(() => quotes.filter((q) => q.status === 'sent' || q.status === 'viewed').reduce((s, q) => s + (q.total || 0), 0), [quotes]);
  const acceptedValue = useMemo(() => quotes.filter((q) => (q.status === 'accepted' || q.status === 'approved') && !q.receiptId).reduce((s, q) => s + (q.total || 0), 0), [quotes]);

  const newDraft = (): Draft => ({ customer: { name: '' }, items: [{ id: Date.now(), name: '', qty: 1, price: 0 }], discount: 0, taxOn: taxRate > 0, taxRate, notes: '', validDays: 30 });
  const fromQuote = (q: Quote): Draft => ({ id: q.id, number: q.number, customer: { customerId: q.customerId, name: q.client, phone: q.phone, email: q.email, address: q.address }, items: (q.items || []).map((it) => ({ id: it.id, name: it.name, qty: it.qty, price: it.price })), discount: q.discount || 0, taxOn: (q.taxRate ?? 0) > 0, taxRate: q.taxRate ?? taxRate, notes: q.notes || '', validDays: 30, status: q.status, portalToken: q.portalToken, created: q.created });

  // Deep link from Leads: /quotes?newFor=<customerId>
  useEffect(() => {
    const newFor = params?.get('newFor');
    if (!newFor || draft) return;
    const cust = customers.find((x) => x.id === Number(newFor));
    if (!cust) return;
    setDraft({ ...newDraft(), customer: { customerId: cust.id, name: cust.name, phone: cust.phone, email: cust.email, address: [cust.address, cust.city].filter(Boolean).join(', ') } });
  }, [params, customers]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = draft ? computeTotals(draft.items, draft.discount, draft.taxOn ? draft.taxRate : 0) : null;

  const persist = async (status: Quote['status']): Promise<Quote | null> => {
    if (!draft) return null;
    if (!draft.customer.name.trim()) { toast('Customer name is required', '#ff4d6d'); return null; }
    if (draft.items.filter((it) => it.name.trim()).length === 0) { toast('Add at least one line item', '#ff4d6d'); return null; }
    setSaving(true);
    try {
      const cust = await ensureCustomer(draft.customer.name, draft.customer.phone, draft.customer.email, draft.customer.address);
      const number = draft.number || (await nextDocNumber('quote'));
      const items = draft.items.filter((it) => it.name.trim()).map((it) => ({ id: it.id, name: it.name.trim(), qty: Number(it.qty) || 0, price: Number(it.price) || 0 }));
      const t = computeTotals(items, draft.discount, draft.taxOn ? draft.taxRate : 0);
      const validUntil = new Date(Date.now() + draft.validDays * 86400000).toISOString();
      const q: Quote = {
        id: draft.id ?? newId(), number, customerId: cust?.id, client: draft.customer.name.trim(), phone: cust?.phone || draft.customer.phone, email: draft.customer.email, address: draft.customer.address,
        items, subtotal: t.subtotal, discount: draft.discount || 0, taxRate: draft.taxOn ? draft.taxRate : 0, taxLabel, tax: t.tax, total: t.total, currency,
        status, notes: draft.notes, validUntil, created: draft.created || new Date().toISOString(), portalToken: draft.portalToken,
        ...(status === 'sent' ? { sentAt: new Date().toISOString() } : {}),
      };
      await saveQuote(q);
      return q;
    } catch (e) { return null; }
    finally { setSaving(false); }
  };

  const saveDraft = async () => { const q = await persist(draft?.status && draft.status !== 'draft' ? draft.status : 'draft'); if (q) { setDraft(null); toast(`Quote ${q.number} saved`); } };

  const sendQuote = async (existing?: Quote) => {
    const q = existing || (await persist('sent'));
    if (!q) return;
    try {
      const { token, url } = await publish('quote', q);
      const updated: Quote = { ...q, portalToken: token, status: q.status === 'draft' ? 'sent' : q.status, sentAt: q.sentAt || new Date().toISOString() };
      await saveQuote(updated);
      setDraft(null);
      setShare({ q: updated, url, token });
    } catch (e) { toast('Could not create link: ' + ((e as Error)?.message || ''), '#ff4d6d'); }
  };

  const setStatus = async (q: Quote, status: Quote['status']) => {
    const patch: Partial<Quote> = { status };
    if (status === 'accepted') patch.acceptedAt = new Date().toISOString();
    if (status === 'declined') patch.declinedAt = new Date().toISOString();
    await saveQuote({ ...q, ...patch });
    if (q.portalToken) { try { await publish('quote', { ...q, ...patch }); } catch {} }
    toast(`Marked ${status}`);
  };

  const makeReceipt = async (q: Quote) => {
    const number = await nextDocNumber('receipt');
    const r = receiptFromQuote(q, number);
    await saveReceipt(r);
    await saveQuote({ ...q, receiptId: r.id });
    toast(`Receipt ${number} created`);
    router.push('/receipts?open=' + r.id);
  };

  const duplicate = (q: Quote) => setDraft({ ...fromQuote(q), id: undefined, number: undefined, status: undefined, portalToken: undefined, created: undefined });

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Quotes" subtitle={`${quotes.length} total · ${formatMoney(openValue, currency)} awaiting answer · ${formatMoney(acceptedValue, currency)} accepted, not yet receipted`} actions={<Button variant="contained" startIcon={<Add />} onClick={() => setDraft(newDraft())}>New quote</Button>} />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {(['all', 'draft', 'sent', 'accepted', 'declined'] as Filter[]).map((f) => <Chip key={f} label={f === 'sent' ? 'Sent / viewed' : f.charAt(0).toUpperCase() + f.slice(1)} onClick={() => setFilter(f)} color={filter === f ? 'primary' : 'default'} variant={filter === f ? 'filled' : 'outlined'} size="small" />)}
      </Stack>

      {quotes.length === 0 ? (
        <EmptyState icon="📄" title="No quotes yet" subtitle="Create a quote in 30 seconds and send it as a link." actionLabel="New quote" onAction={() => setDraft(newDraft())} />
      ) : (
        <Stack spacing={1}>
          {list.map((q) => (
            <Paper key={q.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${c.border}` }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => setDraft(fromQuote(q))} style={{ cursor: 'pointer' }}>
                  <Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ fontWeight: 800, fontSize: 14 }}>{q.number || `Q-${q.id}`}</Typography><StatusChip status={q.status} />{q.receiptId && <Chip size="small" label="Receipted" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}</Stack>
                  <Typography sx={{ fontSize: 13, color: c.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.client}{q.items?.[0]?.name ? ` · ${q.items[0].name}${q.items.length > 1 ? ` +${q.items.length - 1}` : ''}` : ''}</Typography>
                  <Typography sx={{ fontSize: 11, color: c.text3 }}>{formatDateLocal(q.created)}{q.viewedAt ? ' · viewed' : ''}{q.acceptedAt ? ` · accepted ${formatDateLocal(q.acceptedAt)}` : ''}</Typography>
                </Box>
                <Typography sx={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap' }}>{formatMoney(q.total, currency)}</Typography>
                <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, q })}><MoreVert /></IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Menu open={!!menu} anchorEl={menu?.el} onClose={() => setMenu(null)}>
        {menu && [
          <MenuItem key="send" onClick={() => { const q = menu.q; setMenu(null); sendQuote(q); }}><Send fontSize="small" sx={{ mr: 1 }} />{menu.q.portalToken ? 'Share link again' : 'Send'}</MenuItem>,
          <MenuItem key="edit" onClick={() => { setDraft(fromQuote(menu.q)); setMenu(null); }}><Edit fontSize="small" sx={{ mr: 1 }} />Edit</MenuItem>,
          <MenuItem key="dup" onClick={() => { duplicate(menu.q); setMenu(null); }}><ContentCopy fontSize="small" sx={{ mr: 1 }} />Duplicate</MenuItem>,
          ...(menu.q.signedPdfUrl ? [<MenuItem key="pdf" component="a" href={menu.q.signedPdfUrl} target="_blank" rel="noreferrer" onClick={() => setMenu(null)}>📄 Signed agreement (PDF)</MenuItem>] : []),
          <Divider key="d1" />,
          <MenuItem key="acc" onClick={() => { setStatus(menu.q, 'accepted'); setMenu(null); }} disabled={menu.q.status === 'accepted'}><CheckCircle fontSize="small" sx={{ mr: 1 }} />Mark accepted</MenuItem>,
          <MenuItem key="dec" onClick={() => { setStatus(menu.q, 'declined'); setMenu(null); }} disabled={menu.q.status === 'declined'}><Cancel fontSize="small" sx={{ mr: 1 }} />Mark declined</MenuItem>,
          <MenuItem key="rec" onClick={() => { makeReceipt(menu.q); setMenu(null); }} disabled={!!menu.q.receiptId}><ReceiptIcon fontSize="small" sx={{ mr: 1 }} />Create receipt</MenuItem>,
          <Divider key="d2" />,
          <MenuItem key="del" onClick={() => { if (confirm('Delete this quote?')) deleteItem('quotes', menu.q.id); setMenu(null); }} sx={{ color: 'error.main' }}><Delete fontSize="small" sx={{ mr: 1 }} />Delete</MenuItem>,
        ]}
      </Menu>

      {/* Builder */}
      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="md">
        <DialogTitle>{draft?.number ? `Quote ${draft.number}` : 'New quote'}{draft?.status && <Box component="span" sx={{ ml: 1 }}><StatusChip status={draft.status} /></Box>}</DialogTitle>
        <DialogContent>
          {draft && totals && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <CustomerPicker customers={customers} value={draft.customer} onChange={(customer) => setDraft({ ...draft, customer })} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Line items</Typography>
                <LineItemsEditor items={draft.items} onChange={(items) => setDraft({ ...draft, items })} currency={currency} catalog={catalog} />
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <TextField size="small" type="number" label="Discount" value={draft.discount} onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ width: 140 }} />
                <FormControlLabel control={<Switch checked={draft.taxOn} onChange={(e) => setDraft({ ...draft, taxOn: e.target.checked })} />} label={`${taxLabel} ${draft.taxRate}%`} />
                <TextField size="small" type="number" label="Valid for (days)" value={draft.validDays} onChange={(e) => setDraft({ ...draft, validDays: Number(e.target.value) })} sx={{ width: 140 }} />
              </Stack>
              <TextField label="Notes / scope of work" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} multiline minRows={2} fullWidth placeholder="What's included, warranty, timing…" />
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: c.surface2 }}>
                <Line label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
                {draft.discount > 0 && <Line label="Discount" value={'-' + formatMoney(draft.discount, currency)} />}
                {draft.taxOn && <Line label={`${taxLabel} (${draft.taxRate}%)`} value={formatMoney(totals.tax, currency)} />}
                <Line label="Total" value={formatMoney(totals.total, currency)} bold />
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={saveDraft} disabled={saving}>Save</Button>
          <Button variant="contained" startIcon={<Send />} onClick={() => sendQuote()} disabled={saving}>{saving ? 'Working…' : 'Save & send'}</Button>
        </DialogActions>
      </Dialog>

      {share && <ShareDialog open onClose={() => setShare(null)} url={share.url} token={share.token} kind="quote" number={share.q.number || `Q-${share.q.id}`} to={{ phone: share.q.phone, email: share.q.email, name: share.q.client }} bizName={cfg.biz_name || 'us'} replyTo={cfg.biz_email} />}
    </Box>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}><Typography sx={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 900 : 500 }}>{label}</Typography><Typography sx={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 900 : 600 }}>{value}</Typography></Stack>;
}
