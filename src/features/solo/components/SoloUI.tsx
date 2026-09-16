'use client';
import { useState } from 'react';
import { Box, Typography, Chip, TextField, IconButton, Button, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Stack, InputAdornment, Paper } from '@mui/material';
import { Add, Delete, ContentCopy, WhatsApp, Sms, Email, OpenInNew } from '@mui/icons-material';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import type { Customer, PaymentMethod, PaidTo } from '@/types';

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'etransfer', label: 'e-Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit card' },
  { value: 'debit', label: 'Debit' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export const PAID_TO: Array<{ value: PaidTo; label: string }> = [
  { value: 'company', label: 'To company' },
  { value: 'cash', label: 'Cash (with me)' },
  { value: 'me', label: 'To me (e-Transfer)' },
  { value: 'none', label: 'Not paid yet' },
];

export function paymentLabel(v?: PaymentMethod) { return PAYMENT_METHODS.find((p) => p.value === v)?.label || '—'; }
export function paidToLabel(v?: PaidTo) { return PAID_TO.find((p) => p.value === v)?.label || '—'; }

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: 'rgba(0,0,0,0.06)', fg: '#555' },
  sent: { bg: 'rgba(37,99,235,0.10)', fg: '#2563EB' },
  viewed: { bg: 'rgba(124,58,237,0.10)', fg: '#7C3AED' },
  accepted: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  approved: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  declined: { bg: 'rgba(239,68,68,0.10)', fg: '#DC2626' },
  expired: { bg: 'rgba(217,119,6,0.10)', fg: '#D97706' },
  paid: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  partial: { bg: 'rgba(217,119,6,0.10)', fg: '#D97706' },
  unpaid: { bg: 'rgba(239,68,68,0.10)', fg: '#DC2626' },
  refunded: { bg: 'rgba(0,0,0,0.06)', fg: '#555' },
  open: { bg: 'rgba(37,99,235,0.10)', fg: '#2563EB' },
  done: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
};

export function StatusChip({ status }: { status?: string }) {
  const s = status || 'draft';
  const col = STATUS_COLORS[s] || STATUS_COLORS.draft;
  return <Chip size="small" label={s.charAt(0).toUpperCase() + s.slice(1)} sx={{ bgcolor: col.bg, color: col.fg, fontWeight: 700, fontSize: 11, height: 22 }} />;
}

export function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 3, flex: 1, minWidth: 150, border: `1px solid ${c.border}` }}>
      <Typography sx={{ fontSize: 22, fontWeight: 900, color: color || c.text, fontFamily: 'Rubik', lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 12, color: c.text3, mt: 0.5 }}>{label}</Typography>
      {sub && <Typography sx={{ fontSize: 11, color: c.text3 }}>{sub}</Typography>}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Customer picker (existing customer or free text)
// ---------------------------------------------------------------------------
export interface CustomerPickerValue { customerId?: number; name: string; phone?: string; email?: string; address?: string }

export function CustomerPicker({ customers, value, onChange }: { customers: Customer[]; value: CustomerPickerValue; onChange: (v: CustomerPickerValue) => void }) {
  return (
    <Stack spacing={1.5}>
      <Autocomplete
        freeSolo
        options={customers}
        value={value.customerId != null ? (customers.find((x) => x.id === value.customerId) || value.name) : value.name}
        getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.name}${o.phone ? ' · ' + o.phone : ''}`)}
        onChange={(_, o) => {
          if (o && typeof o !== 'string') onChange({ customerId: o.id, name: o.name, phone: o.phone, email: o.email, address: [o.address, o.city, o.postal].filter(Boolean).join(', ') });
          else onChange({ ...value, customerId: undefined, name: typeof o === 'string' ? o : '' });
        }}
        onInputChange={(_, text, reason) => { if (reason === 'input') onChange({ ...value, customerId: undefined, name: text }); }}
        renderInput={(params) => <TextField {...params} label="Customer" placeholder="Start typing a name…" required />}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField label="Phone" value={value.phone || ''} onChange={(e) => onChange({ ...value, phone: e.target.value })} fullWidth />
        <TextField label="Email" value={value.email || ''} onChange={(e) => onChange({ ...value, email: e.target.value })} fullWidth />
      </Stack>
      <TextField label="Service address" value={value.address || ''} onChange={(e) => onChange({ ...value, address: e.target.value })} fullWidth />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Line items
// ---------------------------------------------------------------------------
export interface LineItem { id: number; name: string; qty: number; price: number }

export function LineItemsEditor({ items, onChange, currency, catalog }: { items: LineItem[]; onChange: (items: LineItem[]) => void; currency: string; catalog?: Array<{ name: string; price: number }> }) {
  const update = (i: number, patch: Partial<LineItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const add = () => onChange([...items, { id: Date.now() + items.length, name: '', qty: 1, price: 0 }]);
  return (
    <Box>
      {items.map((it, i) => (
        <Stack key={it.id} direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
          <Autocomplete
            freeSolo size="small" sx={{ flex: 1 }}
            options={(catalog || []).map((p) => p.name)}
            inputValue={it.name}
            onInputChange={(_, v) => update(i, { name: v })}
            onChange={(_, v) => { const hit = (catalog || []).find((p) => p.name === v); update(i, { name: v || '', ...(hit ? { price: hit.price } : {}) }); }}
            renderInput={(params) => <TextField {...params} placeholder="Description" />}
          />
          <TextField size="small" type="number" value={it.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} inputProps={{ min: 0, step: '0.5', style: { width: 56 } }} label="Qty" />
          <TextField size="small" type="number" value={it.price} onChange={(e) => update(i, { price: Number(e.target.value) })} inputProps={{ min: 0, step: '0.01', style: { width: 90 } }} label="Price" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          <Typography sx={{ minWidth: 84, textAlign: 'right', pt: 1.2, fontSize: 13, fontWeight: 600 }}>{formatMoney((it.qty || 0) * (it.price || 0), currency)}</Typography>
          <IconButton size="small" onClick={() => onChange(items.filter((_, idx) => idx !== i))}><Delete fontSize="small" /></IconButton>
        </Stack>
      ))}
      <Button startIcon={<Add />} size="small" onClick={add}>Add line</Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Share dialog — link, WhatsApp, SMS, Email
// ---------------------------------------------------------------------------
export function ShareDialog({ open, onClose, url, kind, number, to, bizName, token, replyTo }: { open: boolean; onClose: () => void; url: string; kind: 'quote' | 'receipt'; number: string; to: { phone?: string; email?: string; name: string }; bizName: string; token: string; replyTo?: string }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState(to.phone || '');
  const [email, setEmail] = useState(to.email || '');
  const [busy, setBusy] = useState<'sms' | 'email' | null>(null);
  const label = kind === 'quote' ? 'quote' : 'receipt';
  const message = `Hi ${to.name || ''}, here is your ${label} ${number} from ${bizName}: ${url}`;

  const copy = async () => { try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast('Copy failed — long-press the link to copy', '#ff4d6d'); } };
  const send = async (channel: 'sms' | 'email') => {
    setBusy(channel);
    try {
      const res = await fetch('/api/docs/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, channel, to: channel === 'sms' ? phone : email, kind, number, url, bizName, customerName: to.name, replyTo }) });
      const data = await res.json();
      if (!res.ok || data.error) toast('Send failed: ' + (data.error || res.statusText), '#ff4d6d');
      else toast(channel === 'sms' ? 'SMS sent' : 'Email sent');
    } catch (e) { toast('Network error', '#ff4d6d'); }
    finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Send {label} {number}</DialogTitle>
      <DialogContent>
        <TextField value={url} fullWidth size="small" InputProps={{ readOnly: true, endAdornment: <IconButton size="small" onClick={copy}><ContentCopy fontSize="small" /></IconButton> }} sx={{ mb: 2, mt: 1 }} />
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button fullWidth variant="outlined" startIcon={<WhatsApp />} href={`https://wa.me/${(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" disabled={!phone}>WhatsApp</Button>
          <Button fullWidth variant="outlined" startIcon={<OpenInNew />} href={url} target="_blank" rel="noreferrer">Preview</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <TextField size="small" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
          <Button variant="contained" startIcon={<Sms />} onClick={() => send('sms')} disabled={!phone || busy === 'sms'}>SMS</Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <Button variant="contained" startIcon={<Email />} onClick={() => send('email')} disabled={!email || busy === 'email'}>Email</Button>
        </Stack>
        <Typography sx={{ fontSize: 11, color: c.text3, mt: 1.5 }}>Email sends from your Gmail once GMAIL_USER + GMAIL_APP_PASSWORD are set; SMS needs a Twilio number. WhatsApp and Copy work right away.</Typography>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, fullWidth = true, size = 'small' }: { label: string; value: T | ''; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; fullWidth?: boolean; size?: 'small' | 'medium' }) {
  return (
    <TextField select label={label} value={value} onChange={(e) => onChange(e.target.value as T)} fullWidth={fullWidth} size={size}>
      {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );
}
