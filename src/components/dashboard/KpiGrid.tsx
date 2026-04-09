'use client';

import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { KpiCard } from '@/components/ui/KpiCard';
import { useData } from '@/hooks/useFirestore';
import { formatCurrency } from '@/lib/formatters';

export function KpiGrid() {
  const { db, cfg } = useData();
  const currency = cfg.currency || 'USD';
  const now = Date.now();
  const dayMs = 86400000;

  const allJobs = db.jobs || [];
  const allLeads = db.leads || [];

  const activeJobs = allJobs.filter((j) => !['completed', 'cancelled'].includes(j.status)).length;
  const openLeads = allLeads.filter((l) => !['converted', 'lost'].includes(l.status)).length;
  const totalQuotes = (db.quotes || []).length;
  const missedCalls = (db.botLog || []).filter((l) => l.msg?.includes('Missed') || l.msg?.includes('📵')).length;

  // This week vs last week comparison
  const trends = useMemo(() => {
    const thisWeekStart = now - 7 * dayMs;
    const lastWeekStart = now - 14 * dayMs;

    const thisWeekJobs = allJobs.filter((j) => j.status === 'completed' && new Date(j.created || 0).getTime() >= thisWeekStart);
    const lastWeekJobs = allJobs.filter((j) => j.status === 'completed' && new Date(j.created || 0).getTime() >= lastWeekStart && new Date(j.created || 0).getTime() < thisWeekStart);

    const thisWeekRev = thisWeekJobs.reduce((s, j) => s + (j.revenue || 0), 0);
    const lastWeekRev = lastWeekJobs.reduce((s, j) => s + (j.revenue || 0), 0);

    const thisWeekLeads = allLeads.filter((l) => new Date(l.created || 0).getTime() >= thisWeekStart).length;
    const lastWeekLeads = allLeads.filter((l) => new Date(l.created || 0).getTime() >= lastWeekStart && new Date(l.created || 0).getTime() < thisWeekStart).length;

    return {
      revTrend: lastWeekRev > 0 ? Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100) : 0,
      jobsTrend: lastWeekJobs.length > 0 ? Math.round(((thisWeekJobs.length - lastWeekJobs.length) / lastWeekJobs.length) * 100) : 0,
      leadsTrend: lastWeekLeads > 0 ? Math.round(((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100) : 0,
      thisWeekRev,
    };
  }, [allJobs, allLeads, now]);

  const monthRevenue = allJobs
    .filter((j) => {
      if (j.status !== 'completed' || !j.created) return false;
      const d = new Date(j.created);
      const today = new Date();
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, j) => sum + (j.revenue || 0), 0);

  const trendArrow = (pct: number) => {
    if (pct === 0) return '';
    return pct > 0 ? `↑${pct}%` : `↓${Math.abs(pct)}%`;
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px',
        mb: '16px',
        '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr) !important' },
        '@media (max-width: 600px)': { gridTemplateColumns: '1fr 1fr !important' },
      }}
    >
      <KpiCard label="Active Jobs" value={activeJobs} subtitle={trends.jobsTrend !== 0 ? `${trendArrow(trends.jobsTrend)} vs last week` : undefined} variant="accent" />
      <KpiCard label="Open Leads" value={openLeads} subtitle={trends.leadsTrend !== 0 ? `${trendArrow(trends.leadsTrend)} vs last week` : undefined} variant="blue" />
      <KpiCard label="Revenue (month)" value={formatCurrency(monthRevenue, currency)} subtitle={trends.revTrend !== 0 ? `${trendArrow(trends.revTrend)} vs last week` : undefined} variant="green" />
      <KpiCard label="Quotes" value={totalQuotes} variant="warm" />
      <KpiCard label="Missed Calls" value={missedCalls} variant="hot" />
    </Box>
  );
}
