'use client';
import { useMemo } from 'react';
import { Box, Typography, Button, Paper, Stack, Chip } from '@mui/material';
import { Add, PersonAdd, CheckCircle } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal } from '@/lib/region';
import { useSolo, weekRange, toDateKey } from '../useSolo';
import { Stat, StatusChip } from '../components/SoloUI';

export default function SoloDashboard() {
  const { cfg, customers, quotes, receipts, closings, currency } = useSolo();
  const router = useRouter();

  const { start, end } = weekRange(new Date());
  const sk = toDateKey(start), ek = toDateKey(end);
  const weekClosings = useMemo(() => closings.filter((x) => x.date >= sk && x.date <= ek), [closings, sk, ek]);
  const weekTotal = weekClosings.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const monthKey = toDateKey(new Date()).slice(0, 7);
  const monthTotal = closings.filter((x) => x.date.startsWith(monthKey)).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const openQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'viewed');
  const acceptedNoReceipt = quotes.filter((q) => (q.status === 'accepted' || q.status === 'approved') && !q.receiptId);
  const outstanding = receipts.filter((r) => r.status !== 'paid' && r.status !== 'refunded');
  const outstandingSum = outstanding.reduce((s, r) => s + (r.balance || 0), 0);
  const openBalances = closings.filter((x) => x.status === 'open');

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();

  return (
    <Box className="zk-fade-up">
      <SectionHeader title={`${greeting}${cfg.biz_name ? ` — ${cfg.biz_name}` : ''}`} subtitle={new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })} />

      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => router.push('/quotes')}>New quote</Button>
        <Button variant="outlined" startIcon={<CheckCircle />} onClick={() => router.push('/closings')}>Log closing</Button>
        <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => router.push('/customers')}>Add customer</Button>
      </Stack>

      <Stack direction="row" sx={{ mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Stat label="Closed this week" value={formatMoney(weekTotal, currency)} sub={`${weekClosings.length} deal${weekClosings.length === 1 ? '' : 's'} · Mon–Sun`} color={c.accent} />
        <Stat label="Closed this month" value={formatMoney(monthTotal, currency)} />
        <Stat label="Quotes awaiting answer" value={formatMoney(openQuotes.reduce((s, q) => s + (q.total || 0), 0), currency)} sub={`${openQuotes.length} open`} color="#2563EB" />
        <Stat label="Receipts outstanding" value={formatMoney(outstandingSum, currency)} sub={`${outstanding.length} unpaid`} color={outstandingSum > 0 ? '#DC2626' : undefined} />
        <Stat label="Customers" value={String(customers.length)} />
      </Stack>

      {(acceptedNoReceipt.length > 0 || openBalances.length > 0) && (
        <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}`, mb: 2.5, bgcolor: 'rgba(217,119,6,0.06)' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Needs attention</Typography>
          {acceptedNoReceipt.map((q) => <Line key={q.id} onClick={() => router.push('/quotes')} left={`${q.number || 'Q-' + q.id} · ${q.client} accepted — create the receipt`} right={formatMoney(q.total, currency)} />)}
          {openBalances.map((x) => <Line key={x.id} onClick={() => router.push('/closings')} left={`${x.client} · ${x.jobType} — balance not collected`} right={formatMoney(x.balance || 0, currency)} />)}
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}` }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Recent closings</Typography>
          {closings.length === 0 ? <Typography sx={{ fontSize: 13, color: c.text3 }}>Nothing logged yet.</Typography> : closings.slice(0, 6).map((x) => <Line key={x.id} onClick={() => router.push('/closings')} left={`${formatDateLocal(x.date)} · ${x.client} · ${x.jobType}`} right={formatMoney(x.amount, currency)} />)}
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}` }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Recent quotes</Typography>
          {quotes.length === 0 ? <Typography sx={{ fontSize: 13, color: c.text3 }}>No quotes yet.</Typography> : quotes.slice(0, 6).map((q) => <Line key={q.id} onClick={() => router.push('/quotes')} left={`${q.number || 'Q-' + q.id} · ${q.client}`} right={<Stack direction="row" spacing={1} alignItems="center"><StatusChip status={q.status} /><b>{formatMoney(q.total, currency)}</b></Stack>} />)}
        </Paper>
      </Box>
      {cfg.tax_rate == null && <Chip label="Tip: set your tax rate and GST/HST number in Settings so documents come out right." onClick={() => router.push('/settings')} sx={{ mt: 2 }} />}
    </Box>
  );
}

function Line({ left, right, onClick }: { left: string; right: React.ReactNode; onClick?: () => void }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="center" onClick={onClick} sx={{ py: 0.6, borderBottom: `1px solid ${c.border}`, cursor: onClick ? 'pointer' : 'default', '&:last-child': { borderBottom: 0 } }}><Typography sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1 }}>{left}</Typography><Typography component="div" sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{right}</Typography></Stack>;
}
