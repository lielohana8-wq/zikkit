'use client';
import { useL } from '@/hooks/useL';

import { useState, useMemo, useCallback } from 'react';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatTime } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job, GPSCheckin } from '@/types';

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

export default function TechGPSPage() {
  const { user } = useAuth();
  const L = useL();
  const { db, saveData } = useData();
  const { toast } = useToast();
  const techName = user?.name || '';
  const [loading, setLoading] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);

  const myJobs = useMemo(() =>
    (db.jobs || []).filter((j) => j.tech === techName),
  [db.jobs, techName]);

  const activeJobs = useMemo(() =>
    myJobs.filter((j) => ['assigned', 'in_progress', 'scheduled'].includes(j.status)),
  [myJobs]);

  const allMyCheckins = useMemo(() => {
    const checkins: (GPSCheckin & { jobClient: string; jobId: number })[] = [];
    myJobs.forEach((j) => {
      if (j.gpsCheckins) {
        j.gpsCheckins.forEach((c) => {
          checkins.push({ ...c, jobClient: j.client, jobId: j.id });
        });
      }
    });
    return checkins.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [myJobs]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCheckins = allMyCheckins.filter((c) => c.time.startsWith(todayStr));
  const currentJob = myJobs.find((j) => j.status === 'in_progress');

  const getPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
      });
    });
  };

  const handleCheckin = useCallback(async (job: Job, type: 'checkin' | 'checkout') => {
    setLoading(true);
    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      setLastPosition({ lat, lng });

      const checkin: GPSCheckin = { lat, lng, time: new Date().toISOString(), jobId: job.id, type };
      const jobsList = [...(db.jobs || [])];
      const idx = jobsList.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        const existing = jobsList[idx].gpsCheckins || [];
        jobsList[idx] = {
          ...jobsList[idx],
          gpsCheckins: [...existing, checkin],
          status: type === 'checkin' ? 'in_progress' : jobsList[idx].status,
        };
        await saveData({ ...db, jobs: jobsList });
        toast(`📍 ${type === 'checkin' ? 'Checked in' : 'Checked out'} — ${job.client}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GPS error';
      toast('❌ ' + msg);
    } finally {
      setLoading(false);
    }
  }, [db, saveData, toast]);

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title="GPS צ'ק-אין" subtitle="צ'ק-אין/אאוט עם מיקום" />

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px', mb: '16px' }}>
        <KpiCard label={L("Today Check-ins","היום")} value={String(todayCheckins.length)} variant="accent" />
        <KpiCard label={L("Active Jobs","עבודות פעילות")} value={String(activeJobs.length)} variant="blue" />
        <KpiCard label={L("Current Job","עבודה נוכחית")} value={currentJob ? currentJob.client : 'None'} variant={currentJob ? 'green' : 'grey'} />
        <KpiCard label={"סה״כ צ׳ק-אינים"} value={String(allMyCheckins.length)} subtitle={'כל הזמן'} variant="teal" />
      </Box>

      {/* Active Jobs — Check-in Buttons */}
      <Card sx={{ mb: '12px' }}>
        <CardHeader icon="🔧" title="עבודות פעילות — צ'ק-אין / אאוט" action={
          <Badge label={activeJobs.length + ' active'} variant="accent" />
        } />
        <CardContent>
          {activeJobs.length === 0 ? (
            <EmptyState icon="🔧" title="אין עבודות פעילות" subtitle="עבודות שמשויכות אליך יופיעו כאן." />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeJobs.map((j) => {
                const sc = JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG];
                const lastCheckin = (j.gpsCheckins || []).filter((c) => c.type === 'checkin').slice(-1)[0];
                const isCheckedIn = j.status === 'in_progress';
                return (
                  <Box key={j.id} sx={{
                    display: 'flex', alignItems: 'center', gap: '12px', p: '12px 16px', borderRadius: '12px',
                    bgcolor: isCheckedIn ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid ' + (isCheckedIn ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.055)'),
                    flexWrap: 'wrap',
                  }}>
                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: '2px' }}>{j.client}</Typography>
                      {j.address && <Typography sx={{ fontSize: 10, color: '#5a7080' }}>📍 {j.address}</Typography>}
                      {j.scheduledTime && <Typography sx={{ fontSize: 10, color: '#4f8fff' }}>🕐 {j.scheduledTime}</Typography>}
                    </Box>
                    <Badge label={sc?.label || j.status} variant={sc?.color || 'grey'} />
                    <Box sx={{ display: 'flex', gap: '6px' }}>
                      {!isCheckedIn && (
                        <Button size="small" onClick={() => handleCheckin(j, 'checkin')} disabled={loading}
                          sx={{
                            px: '14px', py: '6px', fontSize: 11, fontWeight: 700, borderRadius: '10px',
                            bgcolor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)',
                            '&:hover': { bgcolor: '#22c55e', color: '#000' },
                          }}>
                          📍 צ'ק-אין
                        </Button>
                      )}
                      {isCheckedIn && (
                        <Button size="small" onClick={() => handleCheckin(j, 'checkout')} disabled={loading}
                          sx={{
                            px: '14px', py: '6px', fontSize: 11, fontWeight: 700, borderRadius: '10px',
                            bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)',
                            '&:hover': { bgcolor: '#ef4444', color: '#fff' },
                          }}>
                          🚪 צ'ק-אאוט
                        </Button>
                      )}
                      {j.phone && (
                        <Button size="small" onClick={() => window.open('tel:' + j.phone)}
                          sx={{
                            px: '10px', py: '6px', fontSize: 11, fontWeight: 700, borderRadius: '10px',
                            bgcolor: 'rgba(79,143,255,0.08)', color: '#4f8fff', border: '1px solid rgba(79,143,255,0.2)',
                          }}>
                          📞
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Last Position */}
      {lastPosition && (
        <Card sx={{ mb: '12px' }}>
          <CardHeader icon="📌" title={L("Last Recorded Position","מיקום אחרון")} />
          <CardContent>
            <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#00e5b0' }}>
                {lastPosition.lat.toFixed(6)}, {lastPosition.lng.toFixed(6)}
              </Typography>
              <Button size="small" onClick={() => window.open(`https://maps.google.com/?q=${lastPosition.lat},${lastPosition.lng}`, '_blank')}
                sx={{ fontSize: 10, color: '#4f8fff' }}>
                🗺️ Open in Maps
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Recent Check-ins */}
      <Card>
        <CardHeader icon="📋" title={L("My Recent Check-ins","צק-אינים אחרונים")} action={
          <Badge label={allMyCheckins.length + ' total'} variant="accent" />
        } />
        <CardContent sx={{ p: '0 !important' }}>
          {allMyCheckins.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: '#5a7080' }}>No check-ins yet. Use the buttons above to check in to a job.</Typography>
            </Box>
          ) : (
            allMyCheckins.slice(0, 20).map((c, i) => (
              <Box key={c.time + c.jobId} sx={{
                display: 'flex', alignItems: 'center', gap: '12px', p: '10px 16px',
                borderBottom: i < Math.min(allMyCheckins.length, 20) - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none',
              }}>
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  bgcolor: c.type === 'checkin' ? '#22c55e' : c.type === 'checkout' ? '#ef4444' : '#4f8fff',
                }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{c.jobClient}</Typography>
                  <Typography sx={{ fontSize: 10, color: '#5a7080' }}>
                    {formatDate(c.time)} · {formatTime(c.time)}
                  </Typography>
                </Box>
                <Badge label={c.type} variant={c.type === 'checkin' ? 'green' : c.type === 'checkout' ? 'hot' : 'blue'} />
                <Typography sx={{ fontSize: 9, fontFamily: 'monospace', color: '#5a7080' }}>
                  {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                </Typography>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
