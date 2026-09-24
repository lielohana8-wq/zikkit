'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, TextField, InputAdornment, Alert, Switch, FormControlLabel, Autocomplete } from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { zikkitColors as c } from '@/styles/theme';
import { REGION, REGION_DEFAULTS } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSolo } from '../useSolo';
import type { BusinessConfig } from '@/types';

const CURRENCIES = [{ value: 'CAD', label: 'CAD $ — Canadian dollar' }, { value: 'USD', label: 'USD $ — US dollar' }, { value: 'ILS', label: 'ILS ₪ — Israeli shekel' }];

const FIELDS: Array<keyof BusinessConfig> = ['currency', 'timezone', 'biz_name', 'biz_phone', 'biz_email', 'biz_address', 'biz_city', 'biz_province', 'biz_postal', 'biz_website', 'tax_rate', 'tax_label', 'tax_number', 'quote_prefix', 'receipt_prefix', 'numbering_start', 'quote_footer', 'receipt_footer', 'payment_instructions'];

export default function SoloSettings() {
  const { cfg, saveCfg, regionMismatch } = useSolo();
  const { logout } = useAuth();
  const { toast } = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const setup = params?.get('setup') === '1';
  const [form, setForm] = useState<BusinessConfig>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: BusinessConfig = {};
    for (const k of FIELDS) (next as Record<string, unknown>)[k] = (cfg as Record<string, unknown>)[k];
    // A config carried over from another region must not pre-fill Israeli VAT / ILS here
    const mismatch = Boolean(cfg.region) && cfg.region !== REGION;
    if (mismatch || next.tax_rate == null) next.tax_rate = REGION_DEFAULTS.taxRate;
    if (mismatch || !next.tax_label) next.tax_label = REGION_DEFAULTS.taxLabel;
    if (mismatch || !next.currency) next.currency = REGION_DEFAULTS.currency;
    if (!next.biz_province) next.biz_province = 'ON';
    setForm(next);
  }, [cfg, regionMismatch]);

  const set = (k: keyof BusinessConfig, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.biz_name?.trim()) { toast('Business name is required', '#ff4d6d'); return; }
    setSaving(true);
    try {
      await saveCfg({ ...form, tax_rate: Number(form.tax_rate) || 0, numbering_start: Number(form.numbering_start) || 1000, default_share_percent: form.default_share_percent == null || form.default_share_percent === ('' as unknown) ? 100 : Math.max(0, Math.min(100, Number(form.default_share_percent))), currency: form.currency || REGION_DEFAULTS.currency, region: REGION as BusinessConfig['region'], lang: 'en', timezone: REGION_DEFAULTS.timezone, solo_setup_done: true, setup_done: true });
      toast('Settings saved');
      if (setup) router.replace('/dashboard');
    } finally { setSaving(false); }
  };

  return (
    <Box className="zk-fade-up" sx={{ maxWidth: 760 }}>
      <SectionHeader title={setup ? 'Welcome — set up your business' : 'Settings'} subtitle={setup ? 'This takes a minute and makes your quotes and receipts look right.' : 'Business details printed on quotes and receipts'} actions={<Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : setup ? 'Save & start' : 'Save'}</Button>} />
      {setup && <Alert severity="info" sx={{ mb: 2 }}>You can change all of this later from Settings.</Alert>}
      {regionMismatch && <Alert severity="warning" sx={{ mb: 2 }}>This business was set up in another Zikkit region ({String(cfg.region)}), so it still carries that currency and tax. Amounts are shown in {REGION_DEFAULTS.currency} here — press Save to store the {REGION} settings on the business.</Alert>}

      <Section title="Business">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <Box sx={{ minWidth: 150 }}><LogoUpload /></Box>
          <Stack spacing={1.5} sx={{ flex: 1, width: '100%' }}>
            <TextField label="Business name" value={form.biz_name || ''} onChange={(e) => set('biz_name', e.target.value)} required fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label="Phone" value={form.biz_phone || ''} onChange={(e) => set('biz_phone', e.target.value)} fullWidth />
              <TextField label="Email" value={form.biz_email || ''} onChange={(e) => set('biz_email', e.target.value)} fullWidth />
            </Stack>
            <TextField label="Website (optional)" value={form.biz_website || ''} onChange={(e) => set('biz_website', e.target.value)} fullWidth />
          </Stack>
        </Stack>
        <TextField label="Street address" value={form.biz_address || ''} onChange={(e) => set('biz_address', e.target.value)} fullWidth sx={{ mt: 1.5 }} />
        <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
          <TextField label="City" value={form.biz_city || ''} onChange={(e) => set('biz_city', e.target.value)} fullWidth />
          <TextField label={REGION_DEFAULTS.provinceLabel} value={form.biz_province || ''} onChange={(e) => set('biz_province', e.target.value)} sx={{ width: 110 }} />
          <TextField label={REGION_DEFAULTS.postalLabel} value={form.biz_postal || ''} onChange={(e) => set('biz_postal', e.target.value.toUpperCase())} sx={{ width: 150 }} />
        </Stack>
      </Section>

      <Section title="Money & tax">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
          <TextField select label="Currency" value={form.currency || REGION_DEFAULTS.currency} onChange={(e) => set('currency', e.target.value)} sx={{ minWidth: 240 }} SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}>
            {CURRENCIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField label="Tax rate" type="number" value={form.tax_rate ?? ''} onChange={(e) => set('tax_rate', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} sx={{ width: 140 }} />
          <TextField label="Tax label" value={form.tax_label || ''} onChange={(e) => set('tax_label', e.target.value)} sx={{ width: 140 }} helperText="HST / GST / GST+PST" />
          <TextField label={REGION_DEFAULTS.taxNumberLabel} value={form.tax_number || ''} onChange={(e) => set('tax_number', e.target.value)} fullWidth helperText="Printed on documents when set. Required once you register for GST/HST." />
        </Stack>
      </Section>

      <Section title="Commission & job sources">
        <Typography sx={{ fontSize: 12.5, color: c.text3, mb: 1.5 }}>Some jobs come from other companies that take a cut. This is only the default — you set the percentage per job.</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField label="We keep by default" type="number" value={form.default_share_percent ?? 100} onChange={(e) => set('default_share_percent', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} sx={{ width: 190 }} helperText="100% = our own jobs" />
          <FormControlLabel control={<Switch checked={form.materials_before_split !== false} onChange={(e) => set('materials_before_split', e.target.checked)} />} label={<Typography sx={{ fontSize: 13 }}>Take materials off the top, before the split</Typography>} />
        </Stack>
        <Autocomplete
          multiple freeSolo options={[]} value={form.job_sources || []}
          onChange={(_, v) => set('job_sources', (v as string[]).map((x) => x.trim()).filter(Boolean))}
          renderInput={(p) => <TextField {...p} label="Companies we take work from" placeholder="Type a name and press Enter" helperText="These show up in the job and closing pickers" />}
          sx={{ mt: 2 }}
        />
      </Section>

      <Section title="Reviews">
        <TextField label="Google review link" value={form.google_review_url || ''} onChange={(e) => set('google_review_url', e.target.value)} fullWidth placeholder="https://g.page/r/..." helperText="Google Business Profile → Ask for reviews → copy link. Sent to the customer after a job is closed." />
        <TextField label="Review message" value={form.review_message || ''} onChange={(e) => set('review_message', e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1.5 }} placeholder="Thanks for choosing us! If we did a good job, a quick Google review really helps: {link}" helperText="{link} is replaced with your review link, {name} with the customer's name." />
      </Section>

      <Section title="Documents">
        <Stack direction="row" spacing={1.5}>
          <TextField label="Quote prefix" value={form.quote_prefix || 'Q'} onChange={(e) => set('quote_prefix', e.target.value.toUpperCase())} sx={{ width: 130 }} />
          <TextField label="Receipt prefix" value={form.receipt_prefix || 'R'} onChange={(e) => set('receipt_prefix', e.target.value.toUpperCase())} sx={{ width: 130 }} />
          <TextField label="Numbering starts at" type="number" value={form.numbering_start ?? 1000} onChange={(e) => set('numbering_start', e.target.value)} sx={{ width: 170 }} helperText="Only affects new numbers" />
        </Stack>
        <TextField label="Payment instructions (printed on receipts & accepted quotes)" value={form.payment_instructions || ''} onChange={(e) => set('payment_instructions', e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1.5 }} placeholder="e-Transfer to pay@yourbusiness.ca · Cash or card on site" />
        <TextField label="Quote footer" value={form.quote_footer || ''} onChange={(e) => set('quote_footer', e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1.5 }} placeholder="Terms, warranty, validity…" />
        <TextField label="Receipt footer" value={form.receipt_footer || ''} onChange={(e) => set('receipt_footer', e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1.5 }} placeholder="Thank you for your business!" />
      </Section>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
        <Button color="inherit" onClick={logout}>Sign out</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </Stack>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${c.border}`, mb: 2 }}><Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1.5, color: c.text2 }}>{title}</Typography>{children}</Paper>;
}
