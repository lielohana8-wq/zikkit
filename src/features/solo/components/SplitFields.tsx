'use client';
import { Box, Typography, Stack, TextField, InputAdornment, Autocomplete, Switch, FormControlLabel, Paper, Chip } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney } from '@/lib/region';
import { computeSplit, OWN_SOURCE, type SplitResult } from '../split';

export interface SplitValue { source: string; sharePercent: number; materialsBeforeSplit: boolean }

/**
 * Where the job came from and how the money is divided. Shown on jobs and on
 * closings; hidden from technicians entirely (they never see percentages).
 */
export function SplitEditor({ value, onChange, sources, compact }: { value: SplitValue; onChange: (v: SplitValue) => void; sources: string[]; compact?: boolean }) {
  const own = !value.source || value.source === OWN_SOURCE;
  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Autocomplete
          freeSolo size={compact ? 'small' : 'medium'} sx={{ flex: 1, minWidth: 180 }}
          options={[OWN_SOURCE, ...sources]}
          value={value.source || OWN_SOURCE}
          onInputChange={(_, v, reason) => { if (reason === 'input') onChange({ ...value, source: v }); }}
          onChange={(_, v) => {
            const source = (typeof v === 'string' ? v : '') || OWN_SOURCE;
            onChange({ ...value, source, sharePercent: source === OWN_SOURCE ? 100 : (value.sharePercent >= 100 ? 30 : value.sharePercent) });
          }}
          renderInput={(p) => <TextField {...p} label="Job came from" placeholder="My own, or a company name" />}
        />
        <TextField
          size={compact ? 'small' : 'medium'} type="number" label="We keep"
          value={value.sharePercent} onChange={(e) => onChange({ ...value, sharePercent: Math.max(0, Math.min(100, Number(e.target.value))) })}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          sx={{ width: 130 }} disabled={own}
        />
      </Stack>
      {!own && (
        <FormControlLabel
          sx={{ ml: 0 }}
          control={<Switch size="small" checked={value.materialsBeforeSplit} onChange={(e) => onChange({ ...value, materialsBeforeSplit: e.target.checked })} />}
          label={<Typography sx={{ fontSize: 12.5, color: c.text2 }}>Take materials off the top, before the split</Typography>}
        />
      )}
    </Stack>
  );
}

/** Live breakdown of what the job is worth to us. */
export function SplitBreakdown({ amount, materials, split, currency, dense }: { amount: number; materials: number; split: SplitValue; currency: string; dense?: boolean }) {
  const r: SplitResult = computeSplit({ amount, materials, sharePercent: split.sharePercent, materialsBeforeSplit: split.materialsBeforeSplit });
  const row = (label: string, value: string, strong?: boolean, color?: string) => (
    <Stack direction="row" justifyContent="space-between" sx={{ py: strong ? 0.5 : 0.3, borderTop: strong ? `1px solid ${c.border}` : 'none', mt: strong ? 0.5 : 0 }}>
      <Typography sx={{ fontSize: strong ? 14 : 12.5, fontWeight: strong ? 800 : 500, color: color || (strong ? c.text : c.text2) }}>{label}</Typography>
      <Typography sx={{ fontSize: strong ? 14 : 12.5, fontWeight: strong ? 900 : 600, color: color || c.text }}>{value}</Typography>
    </Stack>
  );

  if (r.isOwnJob && !r.materials) {
    return <Typography sx={{ fontSize: 12.5, color: c.text3 }}>Our own job — we keep the full {formatMoney(r.gross, currency)}.</Typography>;
  }

  return (
    <Paper variant="outlined" sx={{ p: dense ? 1.25 : 1.75, borderRadius: 2, bgcolor: c.surface2 }}>
      {row('Job total', formatMoney(r.gross, currency))}
      {r.materials > 0 && row(split.materialsBeforeSplit ? 'Materials (off the top)' : 'Materials (our side)', '−' + formatMoney(r.materials, currency))}
      {!r.isOwnJob && row(`${split.source || 'Company'} keeps ${100 - r.sharePercent}%`, '−' + formatMoney(r.companyShare, currency))}
      {row(r.isOwnJob ? 'We keep' : `We keep ${r.sharePercent}%`, formatMoney(r.ourShare, currency), true, '#059669')}
    </Paper>
  );
}

/** Small inline badge for lists. */
export function SplitChip({ source, sharePercent }: { source?: string; sharePercent?: number }) {
  if (!source || source === OWN_SOURCE) return null;
  return <Chip size="small" label={`${source}${sharePercent != null && sharePercent < 100 ? ` · ${sharePercent}%` : ''}`} sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(124,58,237,0.10)', color: '#7C3AED', fontWeight: 700 }} />;
}

export function OurShareLine({ value, currency }: { value: number; currency: string }) {
  return <Box component="span" sx={{ color: '#059669', fontWeight: 700 }}>{formatMoney(value, currency)}</Box>;
}
