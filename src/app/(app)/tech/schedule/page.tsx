'use client';

import { useL } from '@/hooks/useL';
import { useState, useMemo } from 'react';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { formatCurrency } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job } from '@/types';

type ViewMode = 'day' | 'week';

function CardHeader({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <Box className="zk-fade-up" sx={{ p: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <Typography sx={{ fontFamily: "'Rubik', sans-serif", fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', letterSpacing: '-0.2px' }}>
        {icon} {title}
      </Typography>
      {action}
    </Box>
  );
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TechSchedulePage() {
  const { user } = useAuth();
  const L = useL();
  const { db, cfg } = useData();
  const currency = cfg.currency || 'USD';
  const techName = user?.name || '';
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentStr = currentDate.toISOString().slice(0, 10);

  const myJobs = useMemo(() => (db.jobs || []).filter((j) => j.tech === techName), [db.jobs, techName]);

  const dayJobs = useMemo(() =>
    myJobs.filter((j) => {
      const d = j.scheduledDate || j.date || j.created || '';
      return d.startsWith(currentStr) && j.status !== 'cancelled';
    }).sort((a, b) => (a.scheduledTime || a.time || '99:99').localeCompare(b.scheduledTime || b.time || '99:99')),
  [myJobs, currentStr]);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekJobMap = useMemo(() => {
    const map: Record<string, Job[]> = {};
    weekDays.forEach((d) => {
      const key = d.toISOString().slice(0, 10);
      map[key] = myJobs.filter((j) => {
        const jd = j.scheduledDate || j.date || j.created || '';
        return jd.startsWith(key) && j.status !== 'cancelled';
      }).sort((a, b) => (a.scheduledTime || a.time || '').localeCompare(b.scheduledTime || b.time || ''));
    });
    return map;
  }, [weekDays, myJobs]);

  const todayJobsCount = myJobs.filter((j) => {
    const d = j.scheduledDate || j.date || j.created || '';
    return d.startsWith(todayStr) && !['completed', 'cancelled'].includes(j.status);
  }).length;

  const weekJobsCount = useMemo(() => {
    const keys = weekDays.map((d) => d.toISOString().slice(0, 10));
    return myJobs.filter((j) => { const d = j.scheduledDate || j.date || j.created || ''; return keys.some((k) => d.startsWith(k)) && j.status !== 'cancelled'; }).length;
  }, [weekDays, myJobs]);

  const completedToday = myJobs.filter((j) => {
    const d = j.scheduledDate || j.date || j.created || '';
    return d.startsWith(todayStr) && j.status === 'completed';
  }).length;

  const todayRevenue = myJobs
    .filter((j) => j.status === 'completed' && (j.scheduledDate || j.date || j.created || '').startsWith(todayStr))
    .reduce((s, j) => s + (j.revenue || 0), 0);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const isToday = currentStr === todayStr;
  const dateLabel = viewMode === 'day'
    ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const JobCard = ({ job }: { job: Job }) => {
    const sc = JOB_STATUS_CONFIG[job.status as keyof typeof JOB_STATUS_CONFIG];
    return (
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', p: '10px 14px', borderRadius: '10px',
        bgcolor: job.status === 'in_progress' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
        border: '1px solid ' + (job.status === 'in_progress' ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.06)'),
        mb: '6px', transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' },
      }}>
        <Box sx={{ minWidth: 44, textAlign: 'center', pt: '2px' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#4F46E5', fontFamily: 'monospace' }}>
            {job.scheduledTime || job.time || '—'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, mb: '2px' }}>{job.client}</Typography>
          {job.address && <Typography sx={{ fontSize: 10, color: '#78716C', mb: '3px' }}>📍 {job.address}</Typography>}
          {job.desc && <Typography sx={{ fontSize: 10, color: '#78716C' }}>{job.desc}</Typography>}
          {job.phone && <Typography sx={{ fontSize: 10, color: '#4f8fff', cursor: 'pointer' }} onClick={() => window.open('tel:' + job.phone)}>📞 {job.phone}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <Badge label={sc?.label || job.status} variant={sc?.color || 'grey'} />
          {job.revenue ? <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(job.revenue, currency)}</Typography> : null}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title={L("My Schedule","לוח הזמנים שלי")} subtitle={`${techName}'s appointments`} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px', mb: '16px' }}>
        <KpiCard label={L("היום","היום")} value={String(todayJobsCount)} subtitle={L("remaining","נשארו")} variant="accent" />
        <KpiCard label={L("This Week","השבוע")} value={String(weekJobsCount)} subtitle={L("total jobs","עבודות")} variant="blue" />
        <KpiCard label={L("Completed Today","הושלמו היום")} value={String(completedToday)} variant="green" />
        <KpiCard label={L("Today Revenue","הכנסות היום")} value={formatCurrency(todayRevenue, currency)} variant="teal" />
      </Box>

      <Card sx={{ mb: '12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 16px', flexWrap: 'wrap', gap: '8px' }}>
          <Box sx={{ display: 'flex', gap: '6px' }}>
            {(['day', 'week'] as ViewMode[]).map((m) => (
              <Button key={m} size="small" onClick={() => setViewMode(m)} sx={{
                px: '12px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
                bgcolor: viewMode === m ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
                color: viewMode === m ? '#4F46E5' : '#78716C',
                border: '1px solid ' + (viewMode === m ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
              }}>
                {m === 'day' ? '📅 Day' : '🗓️ Week'}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button size="small" onClick={() => navigate(-1)} sx={{ minWidth: 30, fontSize: 14, color: '#A8A29E' }}>←</Button>
            <Typography sx={{ fontSize: 13, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>{dateLabel}</Typography>
            <Button size="small" onClick={() => navigate(1)} sx={{ minWidth: 30, fontSize: 14, color: '#A8A29E' }}>→</Button>
          </Box>
          {!isToday && (
            <Button size="small" onClick={() => setCurrentDate(new Date())} sx={{
              px: '10px', py: '3px', fontSize: 10, fontWeight: 700, borderRadius: '8px',
              bgcolor: 'rgba(79,143,255,0.08)', color: '#4f8fff', border: '1px solid rgba(79,143,255,0.2)',
            }}>
              Today
            </Button>
          )}
        </Box>
      </Card>

      {viewMode === 'day' && (
        <Card>
          <CardHeader icon="📅" title={isToday ? "לוח זמנים להיום" : dateLabel} action={
            <Badge label={dayJobs.length + (dayJobs.length === 1 ? ' job' : ' jobs')} variant="accent" />
          } />
          <CardContent>
            {dayJobs.length === 0 ? (
              <EmptyState icon="📅" title={L("No Jobs Scheduled","אין עבודות מתוכננות")} subtitle={isToday ? 'היום שלך פנוי!' : 'אין עבודות בתאריך הזה.'} />
            ) : dayJobs.map((j) => <JobCard key={j.id} job={j} />)}
          </CardContent>
        </Card>
      )}

      {viewMode === 'week' && (
        <Box sx={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px',
          '@media(max-width:900px)': { gridTemplateColumns: 'repeat(2, 1fr) !important' },
          '@media(max-width:600px)': { gridTemplateColumns: '1fr !important' },
        }}>
          {weekDays.map((d, i) => {
            const key = d.toISOString().slice(0, 10);
            const jobs = weekJobMap[key] || [];
            const isDayToday = key === todayStr;
            return (
              <Card key={key} sx={{
                border: isDayToday ? '1px solid rgba(0,229,176,0.25)' : undefined,
                bgcolor: isDayToday ? 'rgba(0,229,176,0.03)' : undefined,
              }}>
                <Box sx={{ p: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDayToday ? '#4F46E5' : '#A8A29E' }}>{DAY_NAMES[i]}</Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: isDayToday ? '#4F46E5' : '#78716C' }}>{d.getDate()}/{d.getMonth() + 1}</Typography>
                </Box>
                <CardContent sx={{ p: '8px !important', minHeight: 80 }}>
                  {jobs.length === 0 ? (
                    <Typography sx={{ fontSize: 10, color: '#3a4a55', textAlign: 'center', py: 2 }}>—</Typography>
                  ) : jobs.map((j) => {
                    const sc = JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG];
                    return (
                      <Box key={j.id} sx={{ p: '6px 8px', mb: '4px', borderRadius: '6px', bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '2px' }}>
                          <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#4F46E5', fontFamily: 'monospace' }}>{j.scheduledTime || j.time || '—'}</Typography>
                          <Badge label={sc?.label || j.status} variant={sc?.color || 'grey'} />
                        </Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 600 }}>{j.client}</Typography>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
