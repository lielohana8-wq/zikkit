'use client';

import { useL } from '@/hooks/useL';
import { useState, useMemo } from 'react';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { useData } from '@/hooks/useFirestore';
import { formatDate, formatTime, timeAgo } from '@/lib/formatters';
import type { GPSCheckin, Job } from '@/types';

interface TechLocation {
  name: string;
  lastCheckin: GPSCheckin | null;
  currentJob: Job | null;
  totalCheckins: number;
  status: 'on_job' | 'available' | 'offline';
}

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

export default function GPSTrackingPage() {
  const { db } = useData();
  const L = useL();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const techs = useMemo(() => (db.users || []).filter((u) => u.role === 'tech' || u.role === 'technician'), [db.users]);
  const allJobs = db.jobs || [];

  // Gather all GPS checkins from all jobs
  const allCheckins = useMemo(() => {
    const checkins: (GPSCheckin & { tech: string; jobClient: string; jobId: number })[] = [];
    allJobs.forEach((j) => {
      if (j.gpsCheckins && j.tech) {
        j.gpsCheckins.forEach((c) => {
          checkins.push({ ...c, tech: j.tech!, jobClient: j.client, jobId: j.id });
        });
      }
    });
    return checkins.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [allJobs]);

  // Tech locations
  const techLocations = useMemo((): TechLocation[] => {
    return techs.map((tech) => {
      const techCheckins = allCheckins.filter((c) => c.tech === tech.name);
      const lastCheckin = techCheckins[0] || null;
      const activeJob = allJobs.find((j) => j.tech === tech.name && j.status === 'in_progress');
      const hoursAgo = lastCheckin ? (Date.now() - new Date(lastCheckin.time).getTime()) / 3600000 : 999;

      let status: 'on_job' | 'available' | 'offline' = 'offline';
      if (activeJob) status = 'on_job';
      else if (hoursAgo < 2) status = 'available';

      return {
        name: tech.name,
        lastCheckin,
        currentJob: activeJob || null,
        totalCheckins: techCheckins.length,
        status,
      };
    });
  }, [techs, allCheckins, allJobs]);

  const onJobCount = techLocations.filter((t) => t.status === 'on_job').length;
  const availableCount = techLocations.filter((t) => t.status === 'available').length;
  const offlineCount = techLocations.filter((t) => t.status === 'offline').length;

  const selectedTechCheckins = useMemo(() =>
    selectedTech ? allCheckins.filter((c) => c.tech === selectedTech).slice(0, 20) : allCheckins.slice(0, 20),
  [allCheckins, selectedTech]);

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title={L("GPS Tracking","מעקב GPS")} subtitle={L("Live technician locations","מיקומי טכנאים בזמן אמת")} />

      {techs.length === 0 ? (
        <EmptyState icon="🗺️" title="אין טכנאים" subtitle="הוסף טכנאים למעקב GPS." />
      ) : (
        <>
          {/* KPI Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', mb: '16px' }}>
            <KpiCard label={L("On Job","בעבודה")} value={String(onJobCount)} subtitle={onJobCount + ' בעבודה כרגע'} variant="green" />
            <KpiCard label={L("Available","זמין")} value={String(availableCount)} variant="blue" />
            <KpiCard label={L("Offline","לא מחובר")} value={String(offlineCount)} variant="warm" />
            <KpiCard label={"סה״כ צ׳ק-אינים"} value={String(allCheckins.length)} subtitle={'כל הזמן'} variant="teal" />
          </Box>

          {/* Map Placeholder + Tech List */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', mb: '12px', '@media(max-width:768px)': { gridTemplateColumns: '1fr !important' } }}>

            {/* Map placeholder */}
            <Card>
              <CardHeader icon="🗺️" title={L("Map View","תצוגת מפה")} action={
                <Badge label={techs.length + ' techs'} variant="accent" />
              } />
              <CardContent>
                <Box sx={{
                  height: 300, borderRadius: '10px', bgcolor: '#141920', border: '1px solid rgba(255,255,255,0.055)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
                }}>
                  {/* Simulated map grid */}
                  <Box sx={{ position: 'absolute', inset: 0, opacity: 0.05 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Box key={'h' + i} sx={{ position: 'absolute', top: (i + 1) * 12.5 + '%', left: 0, right: 0, height: '1px', bgcolor: '#fff' }} />
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Box key={'v' + i} sx={{ position: 'absolute', left: (i + 1) * 12.5 + '%', top: 0, bottom: 0, width: '1px', bgcolor: '#fff' }} />
                    ))}
                  </Box>

                  {/* Tech pins */}
                  {techLocations.map((t, i) => {
                    const hasPos = t.lastCheckin;
                    // Spread pins around the map for visual representation
                    const x = hasPos ? ((t.lastCheckin!.lng + 180) % 360) / 3.6 : 30 + i * 15;
                    const y = hasPos ? ((90 - t.lastCheckin!.lat) % 180) / 1.8 : 40 + (i % 3) * 15;
                    return (
                      <Box key={t.name} onClick={() => setSelectedTech(selectedTech === t.name ? null : t.name)} sx={{
                        position: 'absolute', left: `${Math.min(Math.max(x, 10), 85)}%`, top: `${Math.min(Math.max(y, 10), 85)}%`,
                        transform: 'translate(-50%, -50%)', cursor: 'pointer', zIndex: 2,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                        transition: 'transform 0.2s', '&:hover': { transform: 'translate(-50%, -50%) scale(1.15)' },
                      }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: t.status === 'on_job' ? 'rgba(34,197,94,0.2)' : t.status === 'available' ? 'rgba(79,143,255,0.2)' : 'rgba(255,255,255,0.08)',
                          border: '2px solid ' + (t.status === 'on_job' ? '#22c55e' : t.status === 'available' ? '#4f8fff' : '#5a7080'),
                          boxShadow: t.status !== 'offline' ? `0 0 12px ${t.status === 'on_job' ? 'rgba(34,197,94,0.4)' : 'rgba(79,143,255,0.3)'}` : 'none',
                          fontSize: 12,
                        }}>
                          👷
                        </Box>
                        <Typography sx={{
                          fontSize: 8, fontWeight: 700, px: '4px', py: '1px', borderRadius: '4px',
                          bgcolor: selectedTech === t.name ? 'rgba(0,229,176,0.15)' : 'rgba(0,0,0,0.6)',
                          color: selectedTech === t.name ? '#00e5b0' : '#a8bcc8',
                          whiteSpace: 'nowrap',
                        }}>
                          {t.name}
                        </Typography>
                      </Box>
                    );
                  })}

                  {allCheckins.length === 0 && (
                    <Typography sx={{ fontSize: 12, color: '#5a7080', zIndex: 1 }}>
                      GPS data will appear here when technicians check in
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Tech Status List */}
            <Card>
              <CardHeader icon="👷" title={L("Technician Status","סטטוס טכנאים")} />
              <CardContent sx={{ p: '0 !important' }}>
                {techLocations.map((t, i) => (
                  <Box key={t.name} onClick={() => setSelectedTech(selectedTech === t.name ? null : t.name)} sx={{
                    display: 'flex', alignItems: 'center', gap: '12px', p: '12px 16px', cursor: 'pointer',
                    borderBottom: i < techLocations.length - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none',
                    bgcolor: selectedTech === t.name ? 'rgba(0,229,176,0.04)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                  }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: t.status === 'on_job' ? '#22c55e' : t.status === 'available' ? '#4f8fff' : '#5a7080',
                      boxShadow: '0 0 6px ' + (t.status === 'on_job' ? '#22c55e' : t.status === 'available' ? '#4f8fff' : '#5a7080'),
                    }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{t.name}</Typography>
                      {t.currentJob ? (
                        <Typography sx={{ fontSize: 10, color: '#22c55e' }}>Working on: {t.currentJob.client}</Typography>
                      ) : t.lastCheckin ? (
                        <Typography sx={{ fontSize: 10, color: '#5a7080' }}>Last seen: {timeAgo(t.lastCheckin.time)}</Typography>
                      ) : (
                        <Typography sx={{ fontSize: 10, color: '#5a7080' }}>{L("No GPS data","אין נתוני GPS")}</Typography>
                      )}
                    </Box>
                    <Badge
                      label={t.status === 'on_job' ? 'On Job' : t.status === 'available' ? 'Available' : 'Offline'}
                      variant={t.status === 'on_job' ? 'green' : t.status === 'available' ? 'blue' : 'grey'}
                    />
                    {t.totalCheckins > 0 && (
                      <Typography sx={{ fontSize: 10, color: '#5a7080' }}>{t.totalCheckins} check-ins</Typography>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>

          {/* Recent Check-ins */}
          <Card>
            <CardHeader icon="📍" title={selectedTech ? `Check-ins — ${selectedTech}` : 'Recent Check-ins'} action={
              selectedTech ? (
                <Button size="small" onClick={() => setSelectedTech(null)} sx={{ fontSize: 10, color: '#5a7080' }}>{L("Show All","הצג הכל")}</Button>
              ) : (
                <Badge label={allCheckins.length + ' total'} variant="accent" />
              )
            } />
            <CardContent sx={{ p: '0 !important' }}>
              {selectedTechCheckins.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: '#5a7080' }}>No GPS check-ins recorded yet</Typography>
                </Box>
              ) : (
                <DataTable
                  keyExtractor={(c: typeof selectedTechCheckins[0]) => c.time + c.tech + c.jobId}
                  columns={[
                    { key: 'tech', label: 'Technician', render: (c: typeof selectedTechCheckins[0]) => <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{c.tech}</Typography> },
                    { key: 'type', label: 'סוג', render: (c: typeof selectedTechCheckins[0]) => (
                      <Badge label={c.type} variant={c.type === 'checkin' ? 'green' : c.type === 'checkout' ? 'hot' : 'blue'} />
                    )},
                    { key: 'job', label: 'Job', render: (c: typeof selectedTechCheckins[0]) => c.jobClient || '—' },
                    { key: 'coords', label: 'Coordinates', render: (c: typeof selectedTechCheckins[0]) => (
                      <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: '#5a7080' }}>
                        {(c.lat || 0).toFixed(4)}, {(c.lng || 0).toFixed(4)}
                      </Typography>
                    )},
                    { key: 'time', label: 'Time', render: (c: typeof selectedTechCheckins[0]) => (
                      <Box>
                        <Typography sx={{ fontSize: 11 }}>{formatDate(c.time)}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#5a7080' }}>{formatTime(c.time)}</Typography>
                      </Box>
                    )},
                  ]}
                  data={selectedTechCheckins}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
