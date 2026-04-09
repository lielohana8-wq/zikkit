'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';

import { useMemo } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { formatCurrency, formatDate, formatJobNumber, formatPercent } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job } from '@/types';

function CardHeader({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <Box className="zk-fade-up" sx={{ p: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.055)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', letterSpacing: '-0.2px' }}>
        {icon} {title}
      </Typography>
      {action}
    </Box>
  );
}

export default function TechDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const L = useL();
  const { lang } = useLanguage();
  const { db, cfg } = useData();
  const currency = cfg.currency || 'USD';
  const techName = user?.name || '';

  const myJobs = useMemo(() =>
    (db.jobs || []).filter((j) => j.tech === techName),
  [db.jobs, techName]);

  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todayJobs = useMemo(() =>
    myJobs.filter((j) => {
      const d = j.scheduledDate || j.date || j.created || '';
      return d.startsWith(today) && !['completed', 'cancelled'].includes(j.status);
    }),
  [myJobs, today]);

  const activeJobs = myJobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
  const completedThisMonth = myJobs.filter((j) => j.status === 'completed' && new Date(j.created || 0) >= monthStart);
  const monthRevenue = completedThisMonth.reduce((s, j) => s + (j.revenue || 0), 0);
  const myCommission = (user as { commission?: number })?.commission || 0;
  const monthCommission = (monthRevenue * myCommission) / 100;
  const completionRate = myJobs.length > 0 ? (myJobs.filter((j) => j.status === 'completed').length / myJobs.length) * 100 : 0;

  const recentJobs = useMemo(() =>
    [...myJobs].sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime()).slice(0, 6),
  [myJobs]);

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Welcome */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(0,229,176,0.08), rgba(79,143,255,0.08))',
        border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px',
        p: '16px 20px', mb: '16px', display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <Box sx={{ fontSize: 36 }}>👷</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, mb: '4px' }}>
            Hey, {techName || 'Technician'}!
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#a8bcc8' }}>
            {todayJobs.length > 0
              ? `You have ${todayJobs.length} job${todayJobs.length > 1 ? 's' : ''} scheduled today.`
              : 'אין עבודות מתוכננות להיום. בדוק את השיבוצים שלך.'}
          </Typography>
        </Box>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '10px', mb: '16px' }}>
        <KpiCard label={L("Today's Jobs","עבודות היום")} value={String(todayJobs.length)} variant="accent" />
        <KpiCard label={L("Active Jobs","עבודות פעילות")} value={String(activeJobs.length)} variant="blue" />
        <KpiCard label={L("This Month","החודש")} value={String(completedThisMonth.length) + ' done'} variant="green" />
        <KpiCard label={L("Month Revenue","הכנסות החודש")} value={formatCurrency(monthRevenue, currency)} variant="teal" />
        <KpiCard label={L("My Commission","העמלה שלי")} value={formatCurrency(monthCommission, currency)} subtitle={myCommission + '%'} variant="purple" />
        <KpiCard label={L("Completion Rate","אחוז השלמה")} value={formatPercent(completionRate)} variant="warm" />
      </Box>

      {/* Today + Recent */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', '@media(max-width:768px)': { gridTemplateColumns: '1fr !important' } }}>
        {/* Today's Schedule */}
        <Card>
          <CardHeader icon="📅" title={L("Today's Schedule","לוח זמנים היום")} action={<Badge label={todayJobs.length + ' jobs'} variant="accent" />} />
          <CardContent sx={{ p: '0 !important' }}>
            {todayJobs.length === 0 ? (
              <Typography sx={{ p: 3, textAlign: 'center', fontSize: 12, color: '#5a7080' }}>{L("No jobs for today","אין עבודות להיום")}</Typography>
            ) : (
              todayJobs.map((j, i) => (
                <Box key={j.id} onClick={() => router.push('/tech/jobs')} sx={{
                  display: 'flex', alignItems: 'center', gap: '10px', p: '10px 16px', cursor: 'pointer',
                  borderBottom: i < todayJobs.length - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                }}>
                  <Box sx={{ fontSize: 10, fontWeight: 700, color: '#5a7080', fontFamily: 'monospace', minWidth: 45 }}>
                    {j.time || '—'}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{j.client}</Typography>
                    <Typography sx={{ fontSize: 10, color: '#5a7080' }}>{j.address || j.desc || ''}</Typography>
                  </Box>
                  <Badge label={(lang==='he'?JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.he:JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.label) || j.status}
                    variant={JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.color || 'grey'} />
                </Box>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader icon="🔧" title={L("עבודות אחרונות","עבודות אחרונות")} />
          <CardContent sx={{ p: '0 !important' }}>
            {recentJobs.length === 0 ? (
              <Typography sx={{ p: 3, textAlign: 'center', fontSize: 12, color: '#5a7080' }}>{L("No jobs assigned yet","עדיין לא שויכו עבודות")}</Typography>
            ) : (
              recentJobs.map((j, i) => (
                <Box key={j.id} sx={{
                  display: 'flex', alignItems: 'center', gap: '10px', p: '10px 16px',
                  borderBottom: i < recentJobs.length - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none',
                }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#5a7080', fontFamily: 'monospace', minWidth: 50 }}>
                    {j.num || formatJobNumber(j.id)}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{j.client}</Typography>
                    <Typography sx={{ fontSize: 10, color: '#5a7080' }}>{formatDate(j.created)}</Typography>
                  </Box>
                  <Badge label={(lang==='he'?JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.he:JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.label) || j.status}
                    variant={JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.color || 'grey'} />
                  {j.revenue ? <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(j.revenue, currency)}</Typography> : null}
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
