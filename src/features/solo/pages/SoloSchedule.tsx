'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Button, Chip, IconButton, Stack, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Divider, useMediaQuery } from '@mui/material';
import { ChevronLeft, ChevronRight, Add, Phone, Navigation, CheckCircle, Edit, Send } from '@mui/icons-material';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { useSolo, weekRange, toDateKey } from '../useSolo';
import { colorForUid, isFieldRole } from '../roles';
import { JobEditorDialog, JOB_STATUS_LABEL, type JobPreset } from '../components/JobEditor';
import { DispatchDialog } from '../components/DispatchDialog';
import { CloseJobDialog } from '../components/CloseJobDialog';
import type { Job } from '@/types';

/**
 * Schedule — a week/day time grid. Every team member has a colour; jobs can be
 * dragged to another time or day and stretched from the bottom edge to change
 * duration (snaps to 15 minutes). Technicians only ever receive their own jobs
 * from the data layer, so they see — and can move — only their own.
 */
const DAY_START = 6;   // 06:00
const DAY_END = 21;    // 21:00
const HOUR_H = 56;     // px per hour
const SNAP = 15;       // minutes
const GRID_H = (DAY_END - DAY_START) * HOUR_H;

const toMin = (t?: string) => { const [h, m] = (t || '09:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const snap = (min: number) => Math.round(min / SNAP) * SNAP;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/**
 * Two jobs at the same hour must sit side by side, not on top of each other.
 * Classic calendar packing: walk the day in start order, drop each job into the
 * first lane that is free, and close the group when a gap appears — every job in
 * a group then shares the same number of lanes, so the columns line up.
 */
function packOverlaps(list: Job[]): Map<number, { lane: number; lanes: number }> {
  const out = new Map<number, { lane: number; lanes: number }>();
  const sorted = [...list].sort((a, b) => toMin(a.scheduledTime) - toMin(b.scheduledTime) || (b.duration || 60) - (a.duration || 60));
  let group: Job[] = [];
  let laneEnds: number[] = [];
  const closeGroup = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const j of group) { const cur = out.get(j.id); if (cur) out.set(j.id, { lane: cur.lane, lanes }); }
    group = []; laneEnds = [];
  };
  for (const j of sorted) {
    const start = toMin(j.scheduledTime);
    const end = start + Math.max(15, j.duration || 60);
    if (laneEnds.length > 0 && start >= Math.max(...laneEnds)) closeGroup();
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); } else { laneEnds[lane] = end; }
    group.push(j);
    out.set(j.id, { lane, lanes: 1 });
  }
  closeGroup();
  return out;
}

interface DragState { job: Job; kind: 'move' | 'resize'; startX: number; startY: number; origMin: number; origDur: number; dayIdx: number; curMin: number; curDur: number; curDay: number; moved: boolean }

export default function SoloSchedule() {
  const { jobs, technicians, team, assignees, assigneeOf, role, uid, currency, saveJob, cfg } = useSolo();
  const { toast } = useToast();
  const isTech = isFieldRole(role);
  const isMobile = useMediaQuery('(max-width:700px)');
  const [view, setView] = useState<'week' | 'day'>(isMobile ? 'day' : 'week');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [techFilter, setTechFilter] = useState<string>('');
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);
  const [editing, setEditing] = useState<{ job?: Job; preset?: JobPreset } | null>(null);
  const [closing, setClosing] = useState<Job | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const colWidthRef = useRef(1);
  const draggedRef = useRef(false);

  useEffect(() => { setView(isMobile ? 'day' : 'week'); }, [isMobile]);

  const days = useMemo(() => {
    if (view === 'day') return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())];
    const { start } = weekRange(anchor); return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, anchor]);
  const dayKeys = days.map(toDateKey);
  const todayKey = toDateKey(new Date());

  const colorOf = useCallback((j: Job) => {
    if (!j.techUid) return '#6B7280';
    const member = team.find((t) => t.uid === j.techUid);
    return colorForUid(j.techUid, member?.color || assigneeOf(j.techUid)?.color);
  }, [team, assigneeOf]);

  const visible = useMemo(() => jobs.filter((j) => j.status !== 'cancelled' && dayKeys.includes(j.scheduledDate || '') && (!techFilter || (techFilter === 'unassigned' ? !j.techUid : j.techUid === techFilter))), [jobs, dayKeys, techFilter]);
  const unscheduled = useMemo(() => jobs.filter((j) => !j.scheduledDate && j.status !== 'completed' && j.status !== 'cancelled'), [jobs]);

  // ---- drag & resize -------------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent, job: Job, kind: 'move' | 'resize') => {
    if (e.button !== 0) return;
    if (isTech) return;
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const grid = gridRef.current; if (grid) colWidthRef.current = grid.getBoundingClientRect().width / days.length;
    const origMin = toMin(job.scheduledTime); const origDur = job.duration || 60;
    setDrag({ job, kind, startX: e.clientX, startY: e.clientY, origMin, origDur, dayIdx: dayKeys.indexOf(job.scheduledDate || ''), curMin: origMin, curDur: origDur, curDay: dayKeys.indexOf(job.scheduledDate || ''), moved: false });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY; const dx = e.clientX - drag.startX;
    const moved = drag.moved || Math.abs(dy) > 4 || Math.abs(dx) > 4;
    if (drag.kind === 'move') {
      const min = Math.max(DAY_START * 60, Math.min(DAY_END * 60 - drag.origDur, snap(drag.origMin + (dy / HOUR_H) * 60)));
      const day = Math.max(0, Math.min(days.length - 1, drag.dayIdx + Math.round(dx / colWidthRef.current)));
      setDrag({ ...drag, curMin: min, curDay: day, moved });
    } else {
      const dur = Math.max(30, Math.min(DAY_END * 60 - drag.origMin, snap(drag.origDur + (dy / HOUR_H) * 60)));
      setDrag({ ...drag, curDur: dur, moved });
    }
  };
  const onPointerUp = async () => {
    if (!drag) return;
    const d = drag; setDrag(null);
    draggedRef.current = d.moved;
    if (!d.moved) return; // plain click → onClick opens the job
    const patch: Partial<Job> = d.kind === 'move' ? { scheduledTime: toHHMM(d.curMin), scheduledDate: dayKeys[d.curDay] } : { duration: d.curDur };
    try { await saveJob({ ...d.job, ...patch }); toast(d.kind === 'move' ? `Moved to ${dayLabel(days[d.curDay], true)} ${toHHMM(d.curMin)}` : `Now ${d.curDur} min`); } catch { /* provider toasts */ }
  };

  const onGridClick = (e: React.MouseEvent, dayIdx: number) => {
    if (isTech || drag) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const min = DAY_START * 60 + snap(((e.clientY - rect.top) / HOUR_H) * 60);
    setEditing({ preset: { date: dayKeys[dayIdx], time: toHHMM(Math.max(DAY_START * 60, Math.min(DAY_END * 60 - 60, min))), techUid: techFilter && techFilter !== 'unassigned' ? techFilter : undefined } });
  };

  const shift = (n: number) => setAnchor(addDays(anchor, view === 'day' ? n : n * 7));
  const rangeLabel = view === 'day' ? anchor.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }) : `${days[0].toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <Box className="zk-fade-up" sx={{ p: { xs: 1.5, md: 3 }, userSelect: drag ? 'none' : 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => shift(-1)}><ChevronLeft /></IconButton>
          <Typography sx={{ fontWeight: 900, fontSize: 16, minWidth: 180, textAlign: 'center' }}>{rangeLabel}</Typography>
          <IconButton size="small" onClick={() => shift(1)}><ChevronRight /></IconButton>
          <Button size="small" onClick={() => setAnchor(new Date())}>Today</Button>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="Day" size="small" onClick={() => setView('day')} color={view === 'day' ? 'primary' : 'default'} variant={view === 'day' ? 'filled' : 'outlined'} />
          <Chip label="Week" size="small" onClick={() => setView('week')} color={view === 'week' ? 'primary' : 'default'} variant={view === 'week' ? 'filled' : 'outlined'} />
          {!isTech && <Button size="small" startIcon={<Send />} onClick={() => setDispatchOpen(true)}>Send tomorrow</Button>}
          {!isTech && <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setEditing({ preset: { date: toDateKey(anchor) } })}>New job</Button>}
        </Stack>
      </Stack>

      {!isTech && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Chip label="Everyone" size="small" onClick={() => setTechFilter('')} variant={!techFilter ? 'filled' : 'outlined'} color={!techFilter ? 'primary' : 'default'} />
          {assignees.map((t) => <Chip key={t.key} size="small" label={`${t.isMe ? 'Me' : t.name}${t.pending ? ' (pending)' : ''}`} onClick={() => setTechFilter(t.key)} variant={techFilter === t.key ? 'filled' : 'outlined'} sx={{ borderColor: colorForUid(t.key, t.color), color: techFilter === t.key ? '#fff' : colorForUid(t.key, t.color), bgcolor: techFilter === t.key ? colorForUid(t.key, t.color) : 'transparent', fontWeight: 700 }} icon={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colorForUid(t.key, t.color), ml: '6px !important' }} />} />)}
          <Chip label="Unassigned" size="small" onClick={() => setTechFilter('unassigned')} variant={techFilter === 'unassigned' ? 'filled' : 'outlined'} />
          {unscheduled.length > 0 && <Chip label={`${unscheduled.length} unscheduled`} size="small" color="warning" onClick={() => setEditing({ job: unscheduled[0] })} />}
        </Stack>
      )}

      <Paper sx={{ borderRadius: 3, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
        {/* Day headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: `52px repeat(${days.length}, 1fr)`, borderBottom: `1px solid ${c.border}`, bgcolor: c.surface2 }}>
          <Box />
          {days.map((d, i) => {
            const k = dayKeys[i]; const isToday = k === todayKey; const count = visible.filter((j) => j.scheduledDate === k).length;
            return (
              <Box key={k} sx={{ py: 1, textAlign: 'center', borderLeft: `1px solid ${c.border}` }}>
                <Typography sx={{ fontSize: 11, color: isToday ? c.accent : c.text3, fontWeight: 700 }}>{d.toLocaleDateString('en-CA', { weekday: 'short' })}</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1, color: isToday ? c.accent : c.text, display: 'inline-block', px: 1, borderRadius: 2, bgcolor: isToday ? c.accentDim : 'transparent' }}>{d.getDate()}</Typography>
                {count > 0 && <Typography sx={{ fontSize: 10, color: c.text3 }}>{count} job{count === 1 ? '' : 's'}</Typography>}
              </Box>
            );
          })}
        </Box>

        {/* Grid */}
        <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `52px repeat(${days.length}, 1fr)`, minWidth: view === 'week' ? 760 : 0, height: GRID_H, position: 'relative' }}>
            {/* hour labels */}
            <Box sx={{ position: 'relative' }}>
              {Array.from({ length: DAY_END - DAY_START }, (_, i) => <Typography key={i} sx={{ position: 'absolute', top: i * HOUR_H - 7, right: 6, fontSize: 10, color: c.text3 }}>{String(DAY_START + i).padStart(2, '0')}:00</Typography>)}
            </Box>
            {/* day columns */}
            <Box ref={gridRef} sx={{ gridColumn: `2 / span ${days.length}`, display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, position: 'relative' }}>
              {days.map((_, di) => {
                const dayJobs = visible.filter((j) => j.scheduledDate === dayKeys[di]);
                const layout = packOverlaps(dayJobs);
                return (
                <Box key={dayKeys[di]} onClick={(e) => onGridClick(e, di)} sx={{ position: 'relative', borderLeft: `1px solid ${c.border}`, cursor: isTech ? 'default' : 'copy', bgcolor: dayKeys[di] === todayKey ? 'rgba(79,70,229,0.03)' : 'transparent',
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_H - 1}px, ${c.border} ${HOUR_H - 1}px, ${c.border} ${HOUR_H}px)` }}>
                  {dayKeys[di] === todayKey && nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60 && <Box sx={{ position: 'absolute', left: 0, right: 0, top: ((nowMin - DAY_START * 60) / 60) * HOUR_H, height: 2, bgcolor: '#DC2626', zIndex: 3, '&::before': { content: '""', position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: '50%', bgcolor: '#DC2626' } }} />}
                  {dayJobs.map((j) => {
                    const isDragging = drag?.job.id === j.id;
                    const startMin = isDragging && drag.kind === 'move' ? drag.curMin : toMin(j.scheduledTime);
                    const dur = isDragging && drag.kind === 'resize' ? drag.curDur : (j.duration || 60);
                    const dayShift = isDragging && drag.kind === 'move' ? drag.curDay - di : 0;
                    const color = colorOf(j); const done = j.status === 'completed';
                    const canDrag = !done && !isTech; // technicians: read-only calendar
                    // The one being dragged goes full width so it stays readable under the finger.
                    const slot = isDragging ? { lane: 0, lanes: 1 } : (layout.get(j.id) || { lane: 0, lanes: 1 });
                    const slotW = 100 / slot.lanes;
                    return (
                      <Box key={j.id} onPointerDown={(e) => canDrag ? onPointerDown(e, j, 'move') : undefined} onClick={(e) => { e.stopPropagation(); if (draggedRef.current) { draggedRef.current = false; return; } setSelected(j); }}
                        sx={{ position: 'absolute', left: `calc(${slot.lane * slotW}% + 2px)`, width: `calc(${slotW}% - 4px)`, top: ((startMin - DAY_START * 60) / 60) * HOUR_H, height: Math.max(22, (dur / 60) * HOUR_H - 2), zIndex: isDragging ? 10 : 2 + slot.lane,
                          transform: dayShift ? `translateX(calc(${dayShift} * (100% + 6px)))` : undefined, transition: isDragging ? 'none' : 'box-shadow .15s',
                          borderRadius: 2, overflow: 'hidden', cursor: canDrag ? 'grab' : 'pointer', touchAction: 'none',
                          bgcolor: done ? '#F3F4F6' : `${color}1A`, borderLeft: `4px solid ${done ? '#9CA3AF' : color}`, color: done ? '#6B7280' : c.text,
                          boxShadow: isDragging ? '0 10px 24px rgba(0,0,0,.18)' : 'none', opacity: isDragging ? 0.92 : 1, p: '4px 6px' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: done ? 'line-through' : 'none' }}>{toHHMM(startMin)} {j.client}</Typography>
                        {dur >= 45 && slot.lanes < 3 && <Typography sx={{ fontSize: 11, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: done ? '#6B7280' : c.text2 }}>{j.jobType || j.desc}{!isTech && j.tech ? ` · ${j.tech}` : ''}</Typography>}
                        {dur >= 75 && slot.lanes === 1 && j.address && <Typography sx={{ fontSize: 10, color: c.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.address}</Typography>}
                        {canDrag && <Box onPointerDown={(e) => onPointerDown(e, j, 'resize')} sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, cursor: 'ns-resize', '&::after': { content: '""', position: 'absolute', left: '50%', bottom: 2, width: 24, height: 3, ml: '-12px', borderRadius: 2, bgcolor: color, opacity: .5 } }} />}
                      </Box>
                    );
                  })}
                </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Paper>
      <Typography sx={{ fontSize: 11, color: c.text3, mt: 1 }}>{isTech ? 'Tap a job to see the customer details and close it. Times are set by the office.' : 'Drag a job to move it. Pull its bottom edge to change the duration. Click an empty slot to schedule a new job.'}</Typography>

      {/* Job popover */}
      <Dialog open={!!selected && !editing && !closing} onClose={() => setSelected(null)} fullWidth maxWidth="xs">
        {selected && (
          <>
            <DialogTitle sx={{ borderLeft: `6px solid ${colorOf(selected)}`, pb: 1 }}>{selected.client}<Typography sx={{ fontSize: 12, color: c.text3 }}>{dayLabel(new Date((selected.scheduledDate || todayKey) + 'T12:00:00'))} · {selected.scheduledTime} · {selected.duration || 60} min · {JOB_STATUS_LABEL[selected.status] || selected.status}</Typography></DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{selected.jobType || selected.desc}{selected.quoteTotal ? ` · ${formatMoney(selected.quoteTotal, currency)}` : ''}</Typography>
              {selected.address && <Typography sx={{ fontSize: 13, color: c.text2 }}>{selected.address}</Typography>}
              {!isTech && <Typography sx={{ fontSize: 13, color: c.text2 }}>{selected.tech ? `👷 ${selected.tech}` : '⚠️ Unassigned'}</Typography>}
              {selected.notes && <Typography sx={{ fontSize: 13, color: c.text2, mt: 1, whiteSpace: 'pre-wrap' }}>{selected.notes}</Typography>}
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {selected.phone && <Button size="small" variant="outlined" startIcon={<Phone />} href={`tel:${selected.phone}`}>Call</Button>}
                {selected.address && <Button size="small" variant="outlined" startIcon={<Navigation />} href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.address)}`} target="_blank">Navigate</Button>}
                {!isTech && <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => setEditing({ job: selected })}>Edit</Button>}
                {selected.status !== 'completed' && <Button size="small" variant="contained" startIcon={<CheckCircle />} onClick={() => setClosing(selected)}>Close job</Button>}
              </Stack>
            </DialogContent>
            <DialogActions><Button onClick={() => setSelected(null)}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>

      {dispatchOpen && <DispatchDialog onClose={() => setDispatchOpen(false)} />}
      {editing && <JobEditorDialog job={editing.job} preset={editing.preset} onClose={() => { setEditing(null); setSelected(null); }} />}
      {closing && <CloseJobDialog job={closing} onClose={() => { setClosing(null); setSelected(null); }} />}
    </Box>
  );
}

function dayLabel(d: Date, short = false) {
  const k = toDateKey(d), t = toDateKey(new Date()); const tm = new Date(); tm.setDate(tm.getDate() + 1);
  if (k === t) return 'Today'; if (k === toDateKey(tm)) return 'Tomorrow';
  return d.toLocaleDateString('en-CA', short ? { weekday: 'short', day: 'numeric' } : { weekday: 'long', month: 'long', day: 'numeric' });
}
