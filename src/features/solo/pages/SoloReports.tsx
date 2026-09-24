'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, Chip, TextField, LinearProgress } from '@mui/material';
import { Download } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney } from '@/lib/region';
import { useSolo, toDateKey } from '../useSolo';
import { splitOf, OWN_SOURCE } from '../split';
import { Stat } from '../components/SoloUI';

/**
 * Reports — what the business actually earned, once the other company's cut
 * and the parts are taken out. Everything is derived from closings, quotes
 * and receipts; nothing extra is stored.
 */
type Period = 'month' | 'last' | 'quarter' | 'year' | 'custom';

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthName = (key: string) => new Date(key + '-01T12:00:00').toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });

export default function SoloReports() {
  const { closings, quotes, receipts, jobs, customers, currency } = useSolo();
  const [period, setPeriod] = useState<Period>('month');
  const [from, setFrom] = useState(toDateKey(startOfMonth(new Date())));
  const [to, setTo] = useState(toDateKey(new Date()));

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'custom') return { from, to };
    if (period === 'month') return { from: toDateKey(startOfMonth(now)), to: toDateKey(now) };
    if (period === 'last') { const s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: toDateKey(s), to: toDateKey(e) }; }
    if (period === 'quarter') { const s = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); return { from: toDateKey(s), to: toDateKey(now) }; }
    return { from: `${now.getFullYear()}-01-01`, to: toDateKey(now) };
  }, [period, from, to]);

  const inRange = useMemo(() => closings.filter((x) => x.date >= range.from && x.date <= range.to), [closings, range]);

  const totals = useMemo(() => {
    let gross = 0, ourShare = 0, materials = 0, companyCut = 0, collected = 0, outstanding = 0;
    for (const x of inRange) {
      const s = splitOf(x);
      gross += s.gross; ourShare += s.ourShare; materials += s.materials; companyCut += s.companyShare;
      const dep = Number(x.deposit) || 0, bal = Number(x.balance) || 0;
      if (x.depositPaidTo && x.depositPaidTo !== 'none') collected += dep; else outstanding += dep;
      if (x.balancePaidTo && x.balancePaidTo !== 'none') collected += bal; else outstanding += bal;
    }
    const jobsCount = inRange.length;
    return { gross, ourShare, materials, companyCut, collected, outstanding, jobsCount, avg: jobsCount ? gross / jobsCount : 0 };
  }, [inRange]);

  const group = (keyOf: (x: typeof inRange[number]) => string) => {
    const m = new Map<string, { gross: number; ours: number; count: number }>();
    for (const x of inRange) {
      const s = splitOf(x); const k = keyOf(x) || '—';
      const cur = m.get(k) || { gross: 0, ours: 0, count: 0 };
      cur.gross += s.gross; cur.ours += s.ourShare; cur.count += 1; m.set(k, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].gross - a[1].gross);
  };

  const bySource = useMemo(() => group((x) => x.source || OWN_SOURCE), [inRange]); // eslint-disable-line react-hooks/exhaustive-deps
  const byType = useMemo(() => group((x) => x.jobType), [inRange]); // eslint-disable-line react-hooks/exhaustive-deps
  const byTech = useMemo(() => group((x) => x.techName || 'Me'), [inRange]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Last 6 months of gross vs our share — a simple bar strip, no chart library. */
  const months = useMemo(() => {
    const out: Array<{ key: string; gross: number; ours: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = toDateKey(d).slice(0, 7);
      const rows = closings.filter((x) => x.date.startsWith(key));
      out.push({ key, gross: rows.reduce((s, x) => s + splitOf(x).gross, 0), ours: rows.reduce((s, x) => s + splitOf(x).ourShare, 0) });
    }
    return out;
  }, [closings]);
  const monthMax = Math.max(1, ...months.map((m) => m.gross));

  const quoteStats = useMemo(() => {
    const sent = quotes.filter((q) => q.status !== 'draft' && (q.created || '') >= range.from);
    const accepted = sent.filter((q) => q.status === 'accepted' || q.status === 'approved');
    const declined = sent.filter((q) => q.status === 'declined');
    const value = sent.reduce((s, q) => s + (q.total || 0), 0);
    const won = accepted.reduce((s, q) => s + (q.total || 0), 0);
    return { sent: sent.length, accepted: accepted.length, declined: declined.length, rate: sent.length ? Math.round((accepted.length / sent.length) * 100) : 0, value, won };
  }, [quotes, range]);

  const unpaid = useMemo(() => receipts.filter((r) => r.status !== 'paid' && r.status !== 'refunded'), [receipts]);
  const repeatCustomers = useMemo(() => {
    const m = new Map<number, number>();
    for (const x of closings) if (x.customerId != null) m.set(x.customerId, (m.get(x.customerId) || 0) + 1);
    return Array.from(m.values()).filter((n) => n > 1).length;
  }, [closings]);

  const exportCsv = () => {
    const rows: string[][] = [['Report', `${range.from} to ${range.to}`], [], ['Metric', 'Value']];
    rows.push(['Jobs closed', String(totals.jobsCount)], ['Gross closed', String(totals.gross.toFixed(2))], ['Materials', String(totals.materials.toFixed(2))],
      ['Other companies kept', String(totals.companyCut.toFixed(2))], ['Our share', String(totals.ourShare.toFixed(2))],
      ['Collected', String(totals.collected.toFixed(2))], ['Not collected', String(totals.outstanding.toFixed(2))], ['Average job', String(totals.avg.toFixed(2))],
      ['Quotes sent', String(quoteStats.sent)], ['Quotes accepted', String(quoteStats.accepted)], ['Win rate %', String(quoteStats.rate)]);
    const section = (title: string, data: Array<[string, { gross: number; ours: number; count: number }]>) => {
      rows.push([], [title, 'Jobs', 'Gross', 'Our share']);
      for (const [k, v] of data) rows.push([k, String(v.count), v.gross.toFixed(2), v.ours.toFixed(2)]);
    };
    section('By source', bySource); section('By job type', byType); section('By person', byTech);
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report-${range.from}-to-${range.to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const Table = ({ title, data, empty }: { title: string; data: Array<[string, { gross: number; ours: number; count: number }]>; empty: string }) => (
    <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}` }}>
      <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>{title}</Typography>
      {data.length === 0 ? <Typography sx={{ fontSize: 13, color: c.text3 }}>{empty}</Typography> : data.map(([k, v]) => (
        <Box key={k} sx={{ py: 0.7, borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 0 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography sx={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1 }}>{k}</Typography>
            <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatMoney(v.gross, currency)} → <b style={{ color: '#059669' }}>{formatMoney(v.ours, currency)}</b></Typography>
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(100, (v.gross / Math.max(1, data[0][1].gross)) * 100)} sx={{ height: 4, borderRadius: 2, mt: 0.5, bgcolor: c.surface3, '& .MuiLinearProgress-bar': { bgcolor: c.accent } }} />
          <Typography sx={{ fontSize: 11, color: c.text3 }}>{v.count} job{v.count === 1 ? '' : 's'}</Typography>
        </Box>
      ))}
    </Paper>
  );

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Reports" subtitle={`${range.from} → ${range.to}`} actions={<Button startIcon={<Download />} onClick={exportCsv} disabled={inRange.length === 0}>CSV</Button>} />

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {([['month', 'This month'], ['last', 'Last month'], ['quarter', 'This quarter'], ['year', 'This year'], ['custom', 'Custom']] as Array<[Period, string]>).map(([v, l]) => (
          <Chip key={v} label={l} size="small" onClick={() => setPeriod(v)} color={period === v ? 'primary' : 'default'} variant={period === v ? 'filled' : 'outlined'} />
        ))}
        {period === 'custom' && (
          <>
            <TextField size="small" type="date" value={from} onChange={(e) => setFrom(e.target.value)} sx={{ width: 160 }} />
            <TextField size="small" type="date" value={to} onChange={(e) => setTo(e.target.value)} sx={{ width: 160 }} />
          </>
        )}
      </Stack>

      <Stack direction="row" sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stat label="Gross closed" value={formatMoney(totals.gross, currency)} sub={`${totals.jobsCount} job${totals.jobsCount === 1 ? '' : 's'}`} color={c.accent} />
        <Stat label="Our share" value={formatMoney(totals.ourShare, currency)} sub={totals.companyCut > 0 ? `${formatMoney(totals.companyCut, currency)} to other companies` : 'all our own work'} color="#059669" />
        <Stat label="Materials" value={formatMoney(totals.materials, currency)} />
        <Stat label="Average job" value={formatMoney(totals.avg, currency)} />
        <Stat label="Not collected" value={formatMoney(totals.outstanding, currency)} color={totals.outstanding > 0 ? '#DC2626' : undefined} />
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}`, mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1.5 }}>Last 6 months</Typography>
        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ height: 140 }}>
          {months.map((m) => (
            <Box key={m.key} sx={{ flex: 1, textAlign: 'center' }}>
              <Box sx={{ position: 'relative', height: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <Box sx={{ width: '70%', height: `${Math.max(2, (m.gross / monthMax) * 100)}%`, bgcolor: c.accentDim, borderRadius: '4px 4px 0 0', position: 'relative' }}>
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${m.gross ? Math.max(2, (m.ours / m.gross) * 100) : 0}%`, bgcolor: '#059669', borderRadius: '4px 4px 0 0' }} />
                </Box>
              </Box>
              <Typography sx={{ fontSize: 10, color: c.text3, mt: 0.5 }}>{monthName(m.key)}</Typography>
              <Typography sx={{ fontSize: 10, fontWeight: 700 }}>{m.gross ? formatMoney(m.gross, currency).replace(/\.00$/, '') : '—'}</Typography>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: '#059669' }} /><Typography sx={{ fontSize: 11, color: c.text3 }}>our share</Typography></Stack>
          <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: c.accentDim }} /><Typography sx={{ fontSize: 11, color: c.text3 }}>total closed</Typography></Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <Table title="Where the work came from" data={bySource} empty="Nothing closed in this period." />
        <Table title="By job type" data={byType} empty="Nothing closed in this period." />
        <Table title="By person" data={byTech} empty="Nothing closed in this period." />
        <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}` }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Quotes & collection</Typography>
          <Row label="Quotes sent" value={String(quoteStats.sent)} />
          <Row label="Accepted" value={`${quoteStats.accepted} · ${quoteStats.rate}% win rate`} />
          <Row label="Declined" value={String(quoteStats.declined)} />
          <Row label="Value quoted" value={formatMoney(quoteStats.value, currency)} />
          <Row label="Value won" value={formatMoney(quoteStats.won, currency)} />
          <Row label="Receipts unpaid" value={`${unpaid.length} · ${formatMoney(unpaid.reduce((s, r) => s + (r.balance || 0), 0), currency)}`} />
          <Row label="Customers" value={`${customers.length} · ${repeatCustomers} repeat`} />
          <Row label="Jobs booked (all time)" value={String(jobs.length)} />
        </Paper>
      </Box>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6, borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 0 } }}>
      <Typography sx={{ fontSize: 13, color: c.text2 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{value}</Typography>
    </Stack>
  );
}
