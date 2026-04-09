'use client';
import { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { formatCurrency, formatDate, formatJobNumber, formatPercent } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job } from '@/types';

export default function TechDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { db, cfg } = useData();
  const currency = cfg.currency || (cfg.region === 'IL' ? 'ILS' : 'USD');
  const techName = user?.name || '';
  const myJobs = useMemo(() => (db.jobs || []).filter((j: Job) => j.tech === techName), [db.jobs, techName]);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

  const todayJobs = useMemo(() => myJobs.filter((j: Job) => {
    const d = j.scheduledDate || j.date || j.created || '';
    return d.startsWith(today) && !['completed','cancelled'].includes(j.status);
  }).sort((a: Job, b: Job) => (a.scheduledTime || a.time || '').localeCompare(b.scheduledTime || b.time || '')), [myJobs, today]);

  const activeJobs = myJobs.filter((j: Job) => !['completed','cancelled'].includes(j.status));
  const completedMonth = myJobs.filter((j: Job) => j.status === 'completed' && new Date(j.created || 0) >= monthStart);
  const monthRevenue = completedMonth.reduce((s: number, j: Job) => s + (j.revenue || 0), 0);
  const commission = (user as any)?.commission || 0;
  const monthCommission = (monthRevenue * commission) / 100;
  const completionRate = myJobs.length > 0 ? (myJobs.filter((j: Job) => j.status === 'completed').length / myJobs.length) * 100 : 0;

  return (
    <Box className="zk-fade-up">
      {/* Welcome */}
      <Box sx={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.06), rgba(5,150,105,0.06))', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', p: '18px 20px', mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ fontSize: 36 }}>👷</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, mb: '2px' }}>היי, {techName}!</Typography>
          <Typography sx={{ fontSize: 13, color: '#78716C' }}>
            {todayJobs.length > 0 ? `יש לך ${todayJobs.length} עבודות היום` : 'אין עבודות מתוכננות להיום'}
          </Typography>
        </Box>
        <Button variant="contained" size="small" onClick={() => router.push('/tech/jobs')} sx={{ borderRadius: '20px', fontSize: 12 }}>
          לעבודות שלי
        </Button>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px', mb: 2 }}>
        <KpiCard label="עבודות היום" value={String(todayJobs.length)} variant="accent" />
        <KpiCard label="עבודות פעילות" value={String(activeJobs.length)} variant="blue" />
        <KpiCard label="הושלמו החודש" value={String(completedMonth.length)} variant="green" />
        <KpiCard label="הכנסות החודש" value={formatCurrency(monthRevenue, currency)} variant="teal" />
        <KpiCard label="העמלה שלי" value={formatCurrency(monthCommission, currency)} subtitle={commission + '%'} variant="purple" />
        <KpiCard label="אחוז השלמה" value={formatPercent(completionRate)} variant="warm" />
      </Box>

      {/* Today's Jobs */}
      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>📅 העבודות של היום</Typography>
          <Badge label={todayJobs.length + ' עבודות'} variant="accent" />
        </Box>
        <CardContent sx={{ p: '0 !important' }}>
          {todayJobs.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center', fontSize: 13, color: '#78716C' }}>אין עבודות להיום 🎉</Typography>
          ) : todayJobs.map((j: Job, i: number) => (
            <Box key={j.id} onClick={() => router.push('/tech/jobs')} sx={{
              display: 'flex', alignItems: 'center', gap: '12px', p: '12px 16px', cursor: 'pointer',
              borderBottom: i < todayJobs.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.015)' },
            }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#4F46E5', fontFamily: 'monospace', minWidth: 48 }}>
                {j.scheduledTime || j.time || '—'}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>{j.client}</Typography>
                <Typography noWrap sx={{ fontSize: 11, color: '#78716C' }}>{j.address || j.desc || ''}</Typography>
              </Box>
              {j.phone && <Button size="small" href={'tel:' + j.phone} onClick={(e: any) => e.stopPropagation()} sx={{ minWidth: 'auto', p: '4px 8px', fontSize: 14 }}>📞</Button>}
              {j.address && <Button size="small" href={'https://waze.com/ul?q=' + encodeURIComponent(j.address)} target="_blank" onClick={(e: any) => e.stopPropagation()} sx={{ minWidth: 'auto', p: '4px 8px', fontSize: 14 }}>🗺️</Button>}
              <Badge label={JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.he || j.status} variant={JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.color || 'grey'} />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
