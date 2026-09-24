'use client';
import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, Chip, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import { Add, MoreVert, Delete, Edit, CheckCircle, Cancel, Navigation, Phone, PlayArrow, DirectionsCar } from '@mui/icons-material';
import { useSearchParams } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney, formatDateLocal } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { useSolo, toDateKey } from '../useSolo';
import { isFieldRole } from '../roles';
import { CloseJobDialog } from '../components/CloseJobDialog';
import { JobEditorDialog, JOB_STATUS_LABEL as STATUS_LABEL, type JobPreset } from '../components/JobEditor';
import type { Job, JobStatus } from '@/types';

const dayLabel = (key: string) => {
  const today = toDateKey(new Date()); const t = new Date(); t.setDate(t.getDate() + 1); const tomorrow = toDateKey(t);
  if (key === today) return 'Today'; if (key === tomorrow) return 'Tomorrow';
  return new Date(key + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function SoloJobs() {
  const { jobs, quotes, technicians, assignees, assigneeOf, currency, role, uid, saveJob, deleteItem } = useSolo();
  const { toast } = useToast();
  const isTech = isFieldRole(role);
  const params = useSearchParams();
  const [view, setView] = useState<'upcoming' | 'today' | 'done' | 'all'>('upcoming');
  const [onlyMine, setOnlyMine] = useState(false);
  const [editing, setEditing] = useState<{ job?: Job; preset?: JobPreset } | null>(null);
  const [closing, setClosing] = useState<Job | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; j: Job } | null>(null);

  const today = toDateKey(new Date());
  const list = useMemo(() => jobs.filter((j) => {
    if (onlyMine && j.techUid !== uid) return false;
    const done = j.status === 'completed' || j.status === 'cancelled';
    if (view === 'today') return (j.scheduledDate || '') === today && !done;
    if (view === 'done') return done;
    if (view === 'all') return true;
    return !done && (j.scheduledDate || '9999') >= today;
  }), [jobs, view, today, onlyMine, uid]);

  const grouped = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of list) { const k = j.scheduledDate || 'unscheduled'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(j); }
    return Array.from(m.entries()).sort((a, b) => (view === 'done' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])));
  }, [list, view]);

  // Deep link from Leads: /jobs?newFor=<customerId>
  useEffect(() => {
    const newFor = params?.get('newFor');
    if (newFor && !editing) setEditing({ preset: { customerId: Number(newFor) } });
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptedQuotes = useMemo(() => quotes.filter((q) => (q.status === 'accepted' || q.status === 'approved') && !jobs.some((j) => j.quoteId === q.id)), [quotes, jobs]);

  const setStatus = async (j: Job, status: JobStatus) => {
    const patch: Partial<Job> = { status };
    if (status === 'in_progress') patch.startedAt = new Date().toISOString();
    await saveJob({ ...j, ...patch }); toast(STATUS_LABEL[status] || status);
  };
  const assign = async (j: Job, techUid: string) => {
    const t = assigneeOf(techUid);
    await saveJob({ ...j, techUid: techUid || undefined, tech: t?.name || undefined, assigneeRole: t?.role });
    toast(t ? `Assigned to ${t.name}` : 'Unassigned');
  };

  const mapsUrl = (addr?: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr || '')}`;

  return (
    <Box className="zk-fade-up">
      <SectionHeader title={isTech ? 'My jobs' : 'Jobs'} subtitle={`${list.length} ${view === 'done' ? 'finished' : 'scheduled'}`} actions={!isTech ? <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({ preset: {} })}>New job</Button> : undefined} />
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {([['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Done'], ['all', 'All']] as const).map(([v, l]) => <Chip key={v} label={l} onClick={() => setView(v)} color={view === v ? 'primary' : 'default'} variant={view === v ? 'filled' : 'outlined'} size="small" />)}
        {!isTech && assignees.length > 1 && <Chip label="Only mine" size="small" onClick={() => setOnlyMine(!onlyMine)} color={onlyMine ? 'primary' : 'default'} variant={onlyMine ? 'filled' : 'outlined'} />}
      </Stack>

      {!isTech && acceptedQuotes.length > 0 && view !== 'done' && (
        <Paper sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${c.border}`, mb: 2, bgcolor: 'rgba(16,185,129,0.06)' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12, mb: 0.5 }}>Accepted quotes waiting to be scheduled</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {acceptedQuotes.slice(0, 6).map((q) => <Chip key={q.id} label={`${q.number || 'Q-' + q.id} · ${q.client} · ${formatMoney(q.total, currency)}`} onClick={() => setEditing({ preset: { quoteId: q.id } })} size="small" />)}
          </Stack>
        </Paper>
      )}

      {list.length === 0 ? (
        <EmptyState icon="🔧" title={isTech ? 'No jobs assigned yet' : 'No jobs here'} subtitle={isTech ? 'When the office assigns you a job it shows up here.' : 'Schedule a job from an accepted quote or from scratch.'} actionLabel={!isTech ? 'New job' : undefined} onAction={!isTech ? () => setEditing({ preset: {} }) : undefined} />
      ) : grouped.map(([day, dayJobs]) => (
        <Box key={day} sx={{ mb: 2.5 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 13, color: day === today ? c.accent : c.text2, mb: 1 }}>{day === 'unscheduled' ? 'Unscheduled' : dayLabel(day)}{day !== 'unscheduled' && day !== today ? ` · ${formatDateLocal(day)}` : ''}</Typography>
          <Stack spacing={1}>
            {dayJobs.map((j) => (
              <Paper key={j.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${c.border}`, opacity: j.status === 'cancelled' ? 0.55 : 1 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Box sx={{ minWidth: 52, textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 15 }}>{j.scheduledTime || '—'}</Typography>
                    <Typography sx={{ fontSize: 10, color: c.text3 }}>{j.duration ? `${j.duration}m` : ''}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => !isTech && setEditing({ job: j })} style={{ cursor: isTech ? 'default' : 'pointer' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}><Typography sx={{ fontWeight: 800, fontSize: 14 }}>{j.client}</Typography><Chip size="small" label={STATUS_LABEL[j.status] || j.status} sx={{ height: 20, fontSize: 10 }} color={j.status === 'completed' ? 'success' : j.status === 'in_progress' || j.status === 'on_way' ? 'primary' : 'default'} />{j.quoteTotal ? <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatMoney(j.quoteTotal, currency)}</Typography> : null}</Stack>
                    <Typography sx={{ fontSize: 13, color: c.text2 }}>{j.jobType || j.desc}{j.address ? ` · ${j.address}` : ''}</Typography>
                    <Typography sx={{ fontSize: 11, color: c.text3 }}>{!isTech ? (j.tech ? `👷 ${j.tech}` : '⚠️ Unassigned') : ''}{j.notes ? ` · ${j.notes}` : ''}</Typography>
                  </Box>
                  {j.phone && <IconButton size="small" href={`tel:${j.phone}`}><Phone fontSize="small" /></IconButton>}
                  {j.address && <IconButton size="small" href={mapsUrl(j.address)} target="_blank"><Navigation fontSize="small" /></IconButton>}
                  {!isTech && <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, j })}><MoreVert /></IconButton>}
                </Stack>
                {j.status !== 'completed' && j.status !== 'cancelled' && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
                    {j.status === 'scheduled' && <Button size="small" variant="outlined" startIcon={<DirectionsCar />} onClick={() => setStatus(j, 'on_way')}>On my way</Button>}
                    {(j.status === 'scheduled' || j.status === 'on_way') && <Button size="small" variant="outlined" startIcon={<PlayArrow />} onClick={() => setStatus(j, 'in_progress')}>Start</Button>}
                    <Button size="small" variant="contained" startIcon={<CheckCircle />} onClick={() => setClosing(j)}>Close job</Button>
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}

      {/* Staff menu */}
      <Menu open={!!menu} anchorEl={menu?.el} onClose={() => setMenu(null)}>
        {menu && [
          <MenuItem key="edit" onClick={() => { setEditing({ job: menu.j }); setMenu(null); }}><Edit fontSize="small" sx={{ mr: 1 }} />Edit</MenuItem>,
          <Divider key="d0" />,
          ...assignees.map((t) => <MenuItem key={t.uid} onClick={() => { assign(menu.j, t.uid); setMenu(null); }}>{t.role === 'owner' ? '👑' : t.role === 'partner' ? '🤝' : '👷'} {t.name}{t.isMe ? ' (me)' : ''}{menu.j.techUid === t.uid ? ' ✓' : ''}</MenuItem>),
          <MenuItem key="unassign" onClick={() => { assign(menu.j, ''); setMenu(null); }}>Unassign</MenuItem>,
          <Divider key="d1" />,
          <MenuItem key="cancel" onClick={() => { setStatus(menu.j, 'cancelled'); setMenu(null); }}><Cancel fontSize="small" sx={{ mr: 1 }} />Cancel job</MenuItem>,
          <MenuItem key="del" onClick={() => { if (confirm('Delete this job?')) deleteItem('jobs', menu.j.id); setMenu(null); }} sx={{ color: 'error.main' }}><Delete fontSize="small" sx={{ mr: 1 }} />Delete</MenuItem>,
        ]}
      </Menu>

      {editing && <JobEditorDialog job={editing.job} preset={editing.preset} onClose={() => setEditing(null)} />}

      {closing && <CloseJobDialog job={closing} onClose={() => setClosing(null)} />}
    </Box>
  );
}
