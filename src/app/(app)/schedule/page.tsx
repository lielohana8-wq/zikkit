'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box, Typography, IconButton, Button, Chip, Avatar, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, Divider, LinearProgress,
  ToggleButton, ToggleButtonGroup, Menu, Checkbox,
  useMediaQuery, useTheme, Paper, SwipeableDrawer
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Today, Add, Edit, Delete,
  FilterList, AutoFixHigh, AccessTime, LocationOn,
  Schedule as ScheduleIcon, Close,
  ViewDay, ViewWeek, CalendarMonth, ViewTimeline
} from '@mui/icons-material';
import { useData } from '@/hooks/useFirestore';
import { useL } from '@/hooks/useL';
import { useToast } from '@/hooks/useToast';
import { formatJobNumber } from '@/lib/formatters';
import { zikkitColors as c } from '@/styles/theme';
import type { Job, JobStatus } from '@/types/job';
import type { User } from '@/types/user';

/* ─── constants ──────────────────────────────── */
const HOUR_H = 64;
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);
const DAYS_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const DAYS_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const TECH_COLORS = ['#5C8AFF','#00E676','#FF9100','#A78BFA','#FF5A7E','#4F46E5','#EC4899','#84CC16','#F59E0B','#6366F1'];

type ViewMode = 'day' | 'week' | 'month' | 'timeline';

const STATUS: Record<string, { color: string; bg: string; he: string }> = {
  open: { color: '#FFB020', bg: 'rgba(255,176,32,0.12)', he: 'פתוח' },
  assigned: { color: '#5C8AFF', bg: 'rgba(92,138,255,0.12)', he: 'שויך' },
  in_progress: { color: '#FF9100', bg: 'rgba(255,145,0,0.12)', he: 'בטיפול' },
  waiting_parts: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', he: 'ממתין לחלקים' },
  parts_arrived: { color: '#4F46E5', bg: 'rgba(0,229,255,0.12)', he: 'חלקים הגיעו' },
  scheduled: { color: '#5C8AFF', bg: 'rgba(92,138,255,0.12)', he: 'מתוכנן' },
  completed: { color: '#00E676', bg: 'rgba(0,230,118,0.12)', he: 'הושלם' },
  cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', he: 'בוטל' },
  no_answer: { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', he: 'אין מענה' },
  callback: { color: '#EC4899', bg: 'rgba(236,72,153,0.12)', he: 'חזרה' },
  dispute: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', he: 'מחלוקת' },
};

const PRIORITY: Record<string, { he: string; color: string; dot: string }> = {
  low:    { he: 'נמוך', color: '#94A3B8', dot: '●' },
  normal: { he: 'רגיל', color: '#5C8AFF', dot: '●' },
  high:   { he: 'גבוה', color: '#FF9100', dot: '●' },
  urgent: { he: 'דחוף', color: '#EF4444', dot: '●' },
};

/* ─── utils ──────────────────────────────────── */
function fmtD(d: Date) { return d.toISOString().split('T')[0]; }
function isToday(d: string) { return d === fmtD(new Date()); }
function parseD(s: string) { return new Date(s + 'T00:00:00'); }
function jobDate(j: Job) { return j.scheduledDate || j.date || j.created?.split('T')[0] || ''; }
function jobTime(j: Job) { return j.scheduledTime || j.time || '09:00'; }
function jobDur(j: Job) { return j.duration || 60; }
function addMin(t: string, m: number) {
  const [h, mi] = t.split(':').map(Number);
  const total = h * 60 + mi + m;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}
function timeToY(t: string) {
  const [h, m] = (t || '09:00').split(':').map(Number);
  return (h - 6) * HOUR_H + (m / 60) * HOUR_H;
}
function yToTime(y: number) {
  const mins = Math.round((y / HOUR_H) * 60) + 360;
  const snapped = Math.round(mins / 15) * 15;
  return String(Math.floor(snapped / 60)).padStart(2, '0') + ':' + String(snapped % 60).padStart(2, '0');
}
function weekDates(date: Date) {
  const d = new Date(date); d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(x.getDate() + i); return fmtD(x); });
}
function monthDates(date: Date) {
  const y = date.getFullYear(), m = date.getMonth();
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const dates: string[] = [];
  for (let i = first.getDay(); i > 0; i--) dates.push(fmtD(new Date(y, m, 1 - i)));
  for (let i = 1; i <= last.getDate(); i++) dates.push(fmtD(new Date(y, m, i)));
  const rem = 7 - (dates.length % 7); if (rem < 7) for (let i = 1; i <= rem; i++) dates.push(fmtD(new Date(y, m + 1, i)));
  return dates;
}
function tColor(i: number) { return TECH_COLORS[i % TECH_COLORS.length]; }
function detectConflicts(jobs: Job[], tech: string, date: string) {
  const tj = jobs.filter(j => j.tech === tech && jobDate(j) === date && j.status !== 'cancelled')
    .sort((a, b) => jobTime(a).localeCompare(jobTime(b)));
  const res: { a: Job; b: Job }[] = [];
  for (let i = 0; i < tj.length - 1; i++) {
    if (addMin(jobTime(tj[i]), jobDur(tj[i])) > jobTime(tj[i + 1])) res.push({ a: tj[i], b: tj[i + 1] });
  }
  return res;
}

/* ─── Shared: JobCard ────────────────────────── */
function JobCard({ job, color, compact, onClick, onDragStart }: {
  job: Job; color: string; compact?: boolean;
  onClick: () => void; onDragStart?: () => void;
}) {
  const p = PRIORITY[job.priority || 'normal'];
  const s = STATUS[job.status] || STATUS.open;
  return (
    <Box
      draggable={!!onDragStart}
      onDragStart={(e) => { e.stopPropagation(); onDragStart?.(); }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      sx={{
        position: 'relative',
        bgcolor: color + '12',
        borderRight: '3px solid ' + color,
        borderRadius: '8px', height: '100%',
        px: compact ? '8px' : '10px',
        py: compact ? '4px' : '7px',
        cursor: 'grab',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        '&:hover': { bgcolor: color + '22', boxShadow: '0 2px 12px ' + color + '25', transform: 'translateY(-1px)' },
        '&:active': { cursor: 'grabbing', transform: 'scale(0.98)' },
      }}
    >
      {job.priority && job.priority !== 'normal' && (
        <Box sx={{ position: 'absolute', top: 4, left: 5, width: 6, height: 6, borderRadius: '50%', bgcolor: p.color }} />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: color, fontFamily: "'Rubik', sans-serif", letterSpacing: '-0.2px' }}>
          {jobTime(job)}
        </Typography>
        {!compact && <Typography sx={{ fontSize: 9, color: c.text3, fontWeight: 500 }}>— {addMin(jobTime(job), jobDur(job))}</Typography>}
      </Box>
      <Typography noWrap sx={{ fontSize: compact ? 11 : 12.5, fontWeight: 600, color: c.text, lineHeight: 1.3, mt: '1px' }}>
        {job.client}
      </Typography>
      {!compact && (job.desc || job.address) && (
        <Typography noWrap sx={{ fontSize: 10, color: c.text3, mt: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          {job.address && <LocationOn sx={{ fontSize: 10 }} />}
          {job.desc || job.address}
        </Typography>
      )}
      {!compact && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', mt: '3px' }}>
          <Chip label={s.he} size="small" sx={{ height: 16, fontSize: 9, fontWeight: 600, bgcolor: s.bg, color: s.color, '& .MuiChip-label': { px: '5px' } }} />
          {job.num && <Typography sx={{ fontSize: 9, color: c.text3 }}>{job.num}</Typography>}
        </Box>
      )}
    </Box>
  );
}

/* ─── Shared: TechPill ───────────────────────── */
function TechPill({ tech, index, jobCount, capacity }: { tech: User; index: number; jobCount: number; capacity: number }) {
  const clr = tColor(index);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', px: '10px', py: '6px' }}>
      <Avatar sx={{ width: 28, height: 28, bgcolor: clr, fontSize: 11, fontWeight: 700, fontFamily: "'Rubik', sans-serif" }}>
        {tech.name.slice(0, 2)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: c.text, lineHeight: 1.2 }}>{tech.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '2px' }}>
          <LinearProgress variant="determinate" value={capacity} sx={{
            flex: 1, height: 3, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.06)',
            '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: capacity > 90 ? '#EF4444' : capacity > 60 ? '#FF9100' : '#00E676' },
          }} />
          <Typography sx={{ fontSize: 9, color: c.text3, fontWeight: 600, minWidth: 20, textAlign: 'left' }}>{jobCount}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

/* ─── DAY VIEW ───────────────────────────────── */
function DayView({ date, jobs, allJobs, techs, onEdit, onCreate, onDragStart, onDrop, onResize }: any) {
  const dayJobs = jobs.filter((j: Job) => jobDate(j) === date);
  const getCap = (name: string) => {
    const n = allJobs.filter((j: Job) => j.tech === name && jobDate(j) === date && j.status !== 'cancelled').length;
    return Math.min(100, Math.round((n * 60) / 480 * 100));
  };
  return (
    <Box sx={{ display: 'flex', overflow: 'auto' }}>
      <Box sx={{ width: 48, flexShrink: 0, pt: '52px' }}>
        {HOURS.map(h => (
          <Box key={h} sx={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <Typography sx={{ mt: '-7px', fontSize: 10, color: c.text3, fontWeight: 500, fontFamily: "'Rubik', sans-serif" }}>
              {String(h).padStart(2, '0')}:00
            </Typography>
          </Box>
        ))}
      </Box>
      {techs.map((tech: User, ti: number) => {
        const techJobs = dayJobs.filter((j: Job) => j.tech === tech.name);
        const cap = getCap(tech.name);
        const clr = tColor(ti);
        return (
          <Box key={String(tech.id)} sx={{ flex: 1, minWidth: 160, borderRight: '1px solid ' + c.border }}>
            <Box sx={{ height: 52, borderBottom: '1px solid ' + c.border, bgcolor: clr + '08', position: 'sticky', top: 0, zIndex: 2 }}>
              <TechPill tech={tech} index={ti} jobCount={techJobs.length} capacity={cap} />
            </Box>
            <Box
              sx={{ position: 'relative', height: HOURS.length * HOUR_H }}
              onDragOver={(e: any) => e.preventDefault()}
              onDrop={(e: any) => { const rect = e.currentTarget.getBoundingClientRect(); onDrop(date, yToTime(e.clientY - rect.top), tech.name); }}
              onClick={(e: any) => { const rect = e.currentTarget.getBoundingClientRect(); onCreate(date, yToTime(e.clientY - rect.top), tech.name); }}
            >
              {HOURS.map(h => <Box key={h} sx={{ position: 'absolute', top: (h - 6) * HOUR_H, left: 0, right: 0, height: '1px', bgcolor: c.border }} />)}
              {HOURS.map(h => <Box key={'hh' + h} sx={{ position: 'absolute', top: (h - 6) * HOUR_H + HOUR_H / 2, left: 8, right: 8, height: '1px', bgcolor: 'rgba(0,0,0,0.025)' }} />)}
              {isToday(date) && (
                <Box sx={{ position: 'absolute', top: timeToY(new Date().getHours() + ':' + new Date().getMinutes()), left: 0, right: 0, height: 2, bgcolor: '#EF4444', zIndex: 3, '&::before': { content: '""', position: 'absolute', right: -4, top: -4, width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444' } }} />
              )}
              {techJobs.map((job: Job) => {
                const top = timeToY(jobTime(job));
                const dur = jobDur(job); const height = Math.max((dur / 60) * HOUR_H, 36);
                return (
                  <Box key={job.id} sx={{ position: 'absolute', top, left: 4, right: 4, height, zIndex: 1 }}>
                    <JobCard job={job} color={clr} onClick={() => onEdit(job)} onDragStart={() => onDragStart(job)} />
                    <Box
                      sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', display: 'flex', justifyContent: 'center', alignItems: 'center', '&:hover': { bgcolor: clr + '30' }, borderRadius: '0 0 8px 8px' }}
                      onMouseDown={(e: any) => {
                        e.stopPropagation(); e.preventDefault();
                        const startY = e.clientY; const startDur = jobDur(job);
                        const onMove = (ev: MouseEvent) => { const diff = ev.clientY - startY; const newDur = Math.max(15, Math.round((startDur + (diff / HOUR_H) * 60) / 15) * 15); (e.target as HTMLElement).closest('[data-dur-label]')?.setAttribute('data-dur-label', newDur + 'm'); };
                        const onUp = (ev: MouseEvent) => { const diff = ev.clientY - startY; const newDur = Math.max(15, Math.round((startDur + (diff / HOUR_H) * 60) / 15) * 15); if (newDur !== startDur && onResize) onResize(job.id, newDur); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      }}
                    >
                      <Box sx={{ width: 20, height: 3, borderRadius: 2, bgcolor: clr + '40' }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── WEEK VIEW ──────────────────────────────── */
function WeekView({ dates, jobs, techs, onEdit, onCreate, onDragStart, onDrop }: any) {
  return (
    <Box sx={{ display: 'flex', overflow: 'auto' }}>
      <Box sx={{ width: 42, flexShrink: 0, pt: '40px' }}>
        {HOURS.map(h => (
          <Box key={h} sx={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <Typography sx={{ mt: '-7px', fontSize: 9, color: c.text3, fontWeight: 500 }}>{String(h).padStart(2, '0')}</Typography>
          </Box>
        ))}
      </Box>
      {dates.slice(0, 7).map((date: string) => {
        const d = parseD(date);
        const dayJobs = jobs.filter((j: Job) => jobDate(j) === date);
        const today = isToday(date);
        return (
          <Box key={date} sx={{ flex: 1, minWidth: 90, borderRight: '1px solid ' + c.border }}>
            <Box sx={{
              height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderBottom: '1px solid ' + c.border,
              bgcolor: today ? 'rgba(79,70,229,0.06)' : 'transparent',
              position: 'sticky', top: 0, zIndex: 2,
            }}>
              <Typography sx={{ fontSize: 9, color: today ? c.accent : c.text3, fontWeight: 600, lineHeight: 1 }}>{DAYS_SHORT[d.getDay()]}</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: today ? 800 : 600, color: today ? c.accent : c.text, lineHeight: 1.2,
                ...(today && { bgcolor: 'rgba(79,70,229,0.12)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
              }}>{d.getDate()}</Typography>
            </Box>
            <Box
              sx={{ position: 'relative', height: HOURS.length * HOUR_H }}
              onDragOver={(e: any) => e.preventDefault()}
              onDrop={(e: any) => { const rect = e.currentTarget.getBoundingClientRect(); onDrop(date, yToTime(e.clientY - rect.top)); }}
              onClick={(e: any) => { const rect = e.currentTarget.getBoundingClientRect(); onCreate(date, yToTime(e.clientY - rect.top)); }}
            >
              {HOURS.map(h => <Box key={h} sx={{ position: 'absolute', top: (h - 6) * HOUR_H, left: 0, right: 0, height: '1px', bgcolor: 'rgba(0,0,0,0.04)' }} />)}
              {today && <Box sx={{ position: 'absolute', top: timeToY(new Date().getHours() + ':' + new Date().getMinutes()), left: 0, right: 0, height: 2, bgcolor: '#EF4444', zIndex: 3 }} />}
              {dayJobs.map((job: Job) => {
                const top = timeToY(jobTime(job));
                const dur = jobDur(job);
                const height = Math.max((dur / 60) * HOUR_H, 28);
                const ti = techs.findIndex((t: User) => t.name === job.tech);
                const clr = ti >= 0 ? tColor(ti) : (STATUS[job.status]?.color || '#5C8AFF');
                return (
                  <Box key={job.id} sx={{ position: 'absolute', top, left: 2, right: 2, height, zIndex: 1 }}>
                    <JobCard job={job} color={clr} compact onClick={() => onEdit(job)} onDragStart={() => onDragStart(job)} />
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── MONTH VIEW ─────────────────────────────── */
function MonthView({ dates, curMonth, jobs, techs, onEdit, onDayClick }: any) {
  const weeks: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7));
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: '2px' }}>
        {DAYS_SHORT.map(d => <Box key={d} sx={{ py: '6px', textAlign: 'center' }}><Typography sx={{ fontSize: 10, fontWeight: 700, color: c.text3 }}>{d}</Typography></Box>)}
      </Box>
      {weeks.map((week, wi) => (
        <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
          {week.map((date: string) => {
            const d = parseD(date);
            const inMonth = d.getMonth() === curMonth;
            const today = isToday(date);
            const dayJobs = jobs.filter((j: Job) => jobDate(j) === date);
            return (
              <Box key={date} onClick={() => onDayClick(date)} sx={{
                minHeight: 80, p: '4px',
                bgcolor: today ? 'rgba(0,229,255,0.04)' : inMonth ? 'transparent' : 'rgba(0,0,0,0.15)',
                border: '1px solid ' + (today ? 'rgba(0,229,255,0.2)' : c.border),
                borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderColor: c.border2 },
              }}>
                <Typography sx={{ fontSize: 11, fontWeight: today ? 800 : inMonth ? 500 : 400, color: today ? c.accent : inMonth ? c.text : c.text4, textAlign: 'center', mb: '2px', lineHeight: 1.4 }}>{d.getDate()}</Typography>
                {dayJobs.slice(0, 3).map((job: Job) => {
                  const ti = techs.findIndex((t: User) => t.name === job.tech);
                  const clr = ti >= 0 ? tColor(ti) : '#5C8AFF';
                  return (
                    <Box key={job.id} onClick={(e: any) => { e.stopPropagation(); onEdit(job); }} sx={{ px: '4px', py: '1px', mb: '2px', borderRadius: '4px', bgcolor: clr + '18', borderRight: '2px solid ' + clr, cursor: 'pointer' }}>
                      <Typography noWrap sx={{ fontSize: 9, color: c.text2 }}>{jobTime(job)} {job.client}</Typography>
                    </Box>
                  );
                })}
                {dayJobs.length > 3 && <Typography sx={{ fontSize: 9, color: c.text3, textAlign: 'center', fontWeight: 600 }}>+{dayJobs.length - 3}</Typography>}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

/* ─── TIMELINE VIEW ──────────────────────────── */
function TimelineView({ dates, jobs, allJobs, techs, onEdit, onDragStart, onDrop }: any) {
  const [selDate, setSelDate] = useState(dates.find((d: string) => isToday(d)) || dates[0]);
  const dayJobs = jobs.filter((j: Job) => jobDate(j) === selDate);
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: '6px', mb: 2, overflowX: 'auto', pb: 1, '::-webkit-scrollbar': { display: 'none' } }}>
        {dates.slice(0, 7).map((date: string) => {
          const d = parseD(date); const sel = selDate === date; const today = isToday(date);
          return (
            <Chip key={date} label={DAYS_SHORT[d.getDay()] + ' ' + d.getDate()} onClick={() => setSelDate(date)} size="small" sx={{
              fontWeight: sel ? 700 : 500, fontSize: 11,
              bgcolor: sel ? (today ? 'rgba(79,70,229,0.12)' : c.glass3) : 'transparent',
              color: sel ? (today ? c.accent : c.text) : c.text3,
              border: '1px solid ' + (sel ? (today ? 'rgba(0,229,255,0.3)' : c.border2) : c.border),
              '&:hover': { bgcolor: c.glass2 },
            }} />
          );
        })}
      </Box>
      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Box sx={{ minWidth: HOURS.length * 70 + 140 }}>
          <Box sx={{ display: 'flex', ml: '140px', mb: '4px' }}>
            {HOURS.map(h => <Box key={h} sx={{ width: 70, textAlign: 'center' }}><Typography sx={{ fontSize: 9, color: c.text3, fontWeight: 600 }}>{String(h).padStart(2, '0')}:00</Typography></Box>)}
          </Box>
          {techs.map((tech: User, ti: number) => {
            const techJobs = dayJobs.filter((j: Job) => j.tech === tech.name);
            const cap = allJobs.filter((j: Job) => j.tech === tech.name && jobDate(j) === selDate && j.status !== 'cancelled').length;
            const clr = tColor(ti);
            return (
              <Box key={String(tech.id)} sx={{ display: 'flex', alignItems: 'center', height: 52, borderBottom: '1px solid ' + c.border, '&:hover': { bgcolor: 'rgba(255,255,255,0.015)' } }}
                onDragOver={(e: any) => e.preventDefault()}
                onDrop={(e: any) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left - 140; const hour = Math.floor(x / 70) + 6; const mins = Math.round(((x % 70) / 70) * 60 / 15) * 15; onDrop(selDate, String(hour).padStart(2, '0') + ':' + String(mins).padStart(2, '0'), tech.name); }}
              >
                <Box sx={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', px: '10px' }}>
                  <Avatar sx={{ width: 26, height: 26, bgcolor: clr, fontSize: 10, fontWeight: 700 }}>{tech.name.slice(0, 2)}</Avatar>
                  <Box>
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: c.text }}>{tech.name}</Typography>
                    <Typography sx={{ fontSize: 9, color: c.text3 }}>{cap} עבודות</Typography>
                  </Box>
                </Box>
                <Box sx={{ position: 'relative', flex: 1, height: '100%' }}>
                  {HOURS.map(h => <Box key={h} sx={{ position: 'absolute', left: (h - 6) * 70, top: 0, bottom: 0, width: '1px', bgcolor: 'rgba(0,0,0,0.02)' }} />)}
                  {techJobs.map((job: Job) => {
                    const [hh, mm] = jobTime(job).split(':').map(Number);
                    const left = ((hh * 60 + mm - 360) / 60) * 70;
                    const width = (jobDur(job) / 60) * 70;
                    return (
                      <Tooltip key={job.id} title={job.client + ' · ' + jobTime(job)} arrow>
                        <Box draggable onDragStart={() => onDragStart(job)} onClick={() => onEdit(job)} sx={{
                          position: 'absolute', left, top: 7, height: 38, width: Math.max(width, 30),
                          bgcolor: clr + '20', border: '1px solid ' + clr + '55', borderRadius: '6px', px: '6px',
                          display: 'flex', alignItems: 'center', cursor: 'grab', overflow: 'hidden', transition: 'all 0.15s',
                          '&:hover': { bgcolor: clr + '35', boxShadow: '0 2px 8px ' + clr + '30' },
                        }}>
                          <Typography noWrap sx={{ fontSize: 10, fontWeight: 700, color: c.text }}>{job.client}</Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

/* ─── MOBILE LIST VIEW ───────────────────────── */
function MobileListView({ date, jobs, techs, onEdit }: { date: string; jobs: Job[]; techs: User[]; onEdit: (j: Job) => void }) {
  const dayJobs = jobs.filter(j => jobDate(j) === date).sort((a, b) => jobTime(a).localeCompare(jobTime(b)));
  if (dayJobs.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 32, mb: 1 }}>📭</Typography>
        <Typography sx={{ fontSize: 14, color: c.text3, fontWeight: 500 }}>אין עבודות ליום הזה</Typography>
      </Box>
    );
  }
  const grouped: Record<string, Job[]> = {};
  dayJobs.forEach(j => { const key = j.tech || 'לא שובץ'; if (!grouped[key]) grouped[key] = []; grouped[key].push(j); });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Object.entries(grouped).map(([techName, techJobs]) => {
        const ti = techs.findIndex(t => t.name === techName);
        const clr = ti >= 0 ? tColor(ti) : '#94A3B8';
        return (
          <Box key={techName}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '8px', px: '4px' }}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: clr, fontSize: 10, fontWeight: 700 }}>{techName.slice(0, 2)}</Avatar>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: c.text }}>{techName}</Typography>
              <Chip label={String(techJobs.length)} size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: clr + '20', color: clr }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {techJobs.map(job => <JobCard key={job.id} job={job} color={clr} onClick={() => onEdit(job)} />)}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── EDIT MODAL ─────────────────────────────── */
function EditModal({ open, job, techs, onClose, onSave, onDelete, isMobile }: any) {
  const [form, setForm] = useState<Partial<Job>>({});
  useEffect(() => { if (job) setForm({ ...job }); }, [job]);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  if (!job) return null;

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', p: isMobile ? '16px' : 0 }}>
      <TextField label="לקוח" value={form.client || ''} onChange={e => set('client', e.target.value)} fullWidth size="small" />
      <Box sx={{ display: 'flex', gap: '10px' }}>
        <TextField label="טלפון" value={form.phone || ''} onChange={e => set('phone', e.target.value)} fullWidth size="small" />
        <TextField label="אימייל" value={form.email || ''} onChange={e => set('email', e.target.value)} fullWidth size="small" />
      </Box>
      <TextField label="כתובת" value={form.address || ''} onChange={e => set('address', e.target.value)} fullWidth size="small" />
      <TextField label="תיאור" value={form.desc || ''} onChange={e => set('desc', e.target.value)} fullWidth multiline rows={2} size="small" />
      <Box sx={{ display: 'flex', gap: '10px' }}>
        <TextField label="תאריך" type="date" value={form.scheduledDate || ''} onChange={e => set('scheduledDate', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="שעה" type="time" value={form.scheduledTime || ''} onChange={e => set('scheduledTime', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
      </Box>
      <FormControl size="small" sx={{ minWidth: 110 }}><InputLabel>משך זמן</InputLabel>
        <Select value={form.duration || 60} label="משך זמן" onChange={(e: any) => set('duration', Number(e.target.value))}>
          <MenuItem value={30}>30 דק׳</MenuItem><MenuItem value={60}>שעה</MenuItem>
          <MenuItem value={90}>1.5 שעות</MenuItem><MenuItem value={120}>שעתיים</MenuItem>
          <MenuItem value={180}>3 שעות</MenuItem><MenuItem value={240}>4 שעות</MenuItem>
          <MenuItem value={360}>6 שעות</MenuItem><MenuItem value={480}>8 שעות</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth size="small"><InputLabel>טכנאי</InputLabel>
        <Select value={form.tech || ''} label="טכנאי" onChange={e => { const n = e.target.value; const t = techs.find((x: User) => x.name === n); set('tech', n); set('techId', t?.id); if (n) set('status', 'assigned'); }}>
          <MenuItem value=""><em>לא שובץ</em></MenuItem>
          {techs.map((t: User, i: number) => <MenuItem key={String(t.id)} value={t.name}><Avatar sx={{ width: 20, height: 20, bgcolor: tColor(i), fontSize: 9, mr: 1 }}>{t.name[0]}</Avatar>{t.name}</MenuItem>)}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', gap: '10px' }}>
        <FormControl size="small" sx={{ flex: 1 }}><InputLabel>סטטוס</InputLabel>
          <Select value={form.status || 'open'} label="סטטוס" onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.he}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: 1 }}><InputLabel>עדיפות</InputLabel>
          <Select value={form.priority || 'normal'} label="עדיפות" onChange={e => set('priority', e.target.value)}>
            {Object.entries(PRIORITY).map(([k, v]) => <MenuItem key={k} value={k}>{v.dot} {v.he}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <TextField label="הערות" value={form.notes || ''} onChange={e => set('notes', e.target.value)} fullWidth multiline rows={2} size="small" />
    </Box>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer anchor="bottom" open={open} onClose={onClose} onOpen={() => {}} PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxHeight: '92vh', direction: 'rtl' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: '8px', pb: '4px' }}><Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: c.border2 }} /></Box>
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit sx={{ fontSize: 18, color: c.accent }} />
          <Typography sx={{ fontWeight: 700, fontSize: 16, flex: 1 }}>עריכת עבודה</Typography>
          <IconButton size="small" onClick={onClose}><Close sx={{ fontSize: 18 }} /></IconButton>
        </Box>
        <Divider />
        <Box sx={{ overflow: 'auto', pb: 2 }}>{content}</Box>
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid ' + c.border, display: 'flex', gap: 1 }}>
          <Button color="error" size="small" startIcon={<Delete />} onClick={onDelete}>מחק</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} size="small">ביטול</Button>
          <Button variant="contained" size="small" onClick={() => onSave(form)} sx={{ bgcolor: '#00E676', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#00C853' } }}>שמור</Button>
        </Box>
      </SwipeableDrawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', direction: 'rtl', bgcolor: c.surface1 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Edit fontSize="small" sx={{ color: c.accent }} /><Typography sx={{ fontWeight: 700 }}>עריכת עבודה</Typography>
        <Box sx={{ flex: 1 }} />
        <Chip label={(STATUS[form.status || 'open'] || STATUS.open).he} size="small" sx={{ bgcolor: (STATUS[form.status || 'open'] || STATUS.open).bg, color: (STATUS[form.status || 'open'] || STATUS.open).color, fontWeight: 600 }} />
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>{content}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="error" startIcon={<Delete />} onClick={onDelete} size="small">מחק</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} size="small">ביטול</Button>
        <Button variant="contained" onClick={() => onSave(form)} sx={{ bgcolor: '#00E676', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#00C853' } }}>שמור</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── CREATE MODAL ───────────────────────────── */
function CreateModal({ open, slot, techs, onClose, onSave, isMobile }: any) {
  const [form, setForm] = useState<Partial<Job>>({});
  useEffect(() => {
    if (slot) setForm({ client: '', phone: '', address: '', desc: '', notes: '', scheduledDate: slot.date, scheduledTime: slot.time, tech: slot.tech || '', status: (slot.tech ? 'assigned' : 'open') as JobStatus, priority: 'normal' });
  }, [slot]);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', p: isMobile ? '16px' : 0 }}>
      <TextField label="לקוח" value={form.client || ''} onChange={e => set('client', e.target.value)} fullWidth size="small" autoFocus />
      <Box sx={{ display: 'flex', gap: '10px' }}>
        <TextField label="טלפון" value={form.phone || ''} onChange={e => set('phone', e.target.value)} fullWidth size="small" />
        <TextField label="כתובת" value={form.address || ''} onChange={e => set('address', e.target.value)} fullWidth size="small" />
      </Box>
      <TextField label="תיאור" value={form.desc || ''} onChange={e => set('desc', e.target.value)} fullWidth size="small" />
      <Box sx={{ display: 'flex', gap: '10px' }}>
        <TextField label="תאריך" type="date" value={form.scheduledDate || ''} onChange={e => set('scheduledDate', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="שעה" type="time" value={form.scheduledTime || ''} onChange={e => set('scheduledTime', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
      </Box>
      <FormControl size="small" sx={{ minWidth: 110 }}><InputLabel>משך זמן</InputLabel>
        <Select value={form.duration || 60} label="משך זמן" onChange={(e: any) => set('duration', Number(e.target.value))}>
          <MenuItem value={30}>30 דק׳</MenuItem><MenuItem value={60}>שעה</MenuItem>
          <MenuItem value={90}>1.5 שעות</MenuItem><MenuItem value={120}>שעתיים</MenuItem>
          <MenuItem value={180}>3 שעות</MenuItem><MenuItem value={240}>4 שעות</MenuItem>
          <MenuItem value={360}>6 שעות</MenuItem><MenuItem value={480}>8 שעות</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth size="small"><InputLabel>טכנאי</InputLabel>
        <Select value={form.tech || ''} label="טכנאי" onChange={e => { const n = e.target.value; const t = techs.find((x: User) => x.name === n); set('tech', n); set('techId', t?.id); if (n) set('status', 'assigned'); }}>
          <MenuItem value=""><em>לא שובץ</em></MenuItem>
          {techs.map((t: User, i: number) => <MenuItem key={String(t.id)} value={t.name}><Avatar sx={{ width: 20, height: 20, bgcolor: tColor(i), fontSize: 9, mr: 1 }}>{t.name[0]}</Avatar>{t.name}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small"><InputLabel>עדיפות</InputLabel>
        <Select value={form.priority || 'normal'} label="עדיפות" onChange={e => set('priority', e.target.value)}>
          {Object.entries(PRIORITY).map(([k, v]) => <MenuItem key={k} value={k}>{v.dot} {v.he}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField label="הערות" value={form.notes || ''} onChange={e => set('notes', e.target.value)} fullWidth multiline rows={2} size="small" />
    </Box>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer anchor="bottom" open={open} onClose={onClose} onOpen={() => {}} PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxHeight: '92vh', direction: 'rtl' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: '8px', pb: '4px' }}><Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: c.border2 }} /></Box>
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Add sx={{ fontSize: 18, color: '#00E676' }} />
          <Typography sx={{ fontWeight: 700, fontSize: 16, flex: 1 }}>עבודה חדשה</Typography>
          <IconButton size="small" onClick={onClose}><Close sx={{ fontSize: 18 }} /></IconButton>
        </Box>
        <Divider />
        <Box sx={{ overflow: 'auto', pb: 2 }}>{content}</Box>
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid ' + c.border, display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} size="small">ביטול</Button>
          <Button variant="contained" size="small" onClick={() => onSave(form)} sx={{ bgcolor: '#00E676', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#00C853' } }}>צור עבודה</Button>
        </Box>
      </SwipeableDrawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', direction: 'rtl', bgcolor: c.surface1 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Add fontSize="small" sx={{ color: '#00E676' }} /><Typography sx={{ fontWeight: 700 }}>עבודה חדשה</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>{content}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small">ביטול</Button>
        <Button variant="contained" onClick={() => onSave(form)} sx={{ bgcolor: '#00E676', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#00C853' } }}>צור עבודה</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════ */
/* ─── MAIN PAGE ─────────────────────────────── */
/* ═══════════════════════════════════════════════ */

function autoAssign(unassigned: Job[], techs: User[], allJobs: Job[]) {
  const assignments: { jobId: number; techName: string; techId: number | string }[] = [];
  const load: Record<string, number> = {};
  techs.forEach(t => { load[t.name] = 0; });
  allJobs.forEach(j => { if (j.tech && load[j.tech] !== undefined) load[j.tech]++; });
  for (const job of unassigned) {
    let best: User | null = null, bestLoad = Infinity;
    for (const t of techs) { if ((load[t.name] || 0) < bestLoad) { bestLoad = load[t.name] || 0; best = t; } }
    if (best) { assignments.push({ jobId: job.id, techName: best.name, techId: best.id }); load[best.name] = (load[best.name] || 0) + 1; }
  }
  return assignments;
}

export default function SchedulePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { db, saveData } = useData();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSlot, setCreateSlot] = useState<{ date: string; time: string; tech?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [dragJob, setDragJob] = useState<Job | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allJobs = useMemo(() => db.jobs || [], [db.jobs]);
  const techs = useMemo(() => (db.users || []).filter((u: User) => u.role === 'tech' || u.role === 'technician'), [db.users]);

  // Auto-select mobile day view
  useEffect(() => { if (isMobile) setViewMode('day'); }, [isMobile]);
  useEffect(() => { if (selectedTechs.length === 0 && techs.length > 0) setSelectedTechs(techs.map(t => t.name)); }, [techs]);

  const dateRange = useMemo(() => {
    if (viewMode === 'day') return [fmtD(currentDate)];
    if (viewMode === 'week' || viewMode === 'timeline') return weekDates(currentDate);
    return monthDates(currentDate);
  }, [viewMode, currentDate]);

  const unassigned = useMemo(() => allJobs.filter(j => !j.tech && j.status !== 'completed' && j.status !== 'cancelled'), [allJobs]);

  const filteredJobs = useMemo(() => {
    const inRange = allJobs.filter(j => { const d = jobDate(j); return d >= dateRange[0] && d <= dateRange[dateRange.length - 1]; });
    if (selectedTechs.length === techs.length) return inRange;
    return inRange.filter(j => j.tech && selectedTechs.includes(j.tech));
  }, [allJobs, dateRange, selectedTechs, techs]);

  const conflicts = useMemo(() => {
    const all: any[] = [];
    for (const tech of techs) for (const date of dateRange) all.push(...detectConflicts(allJobs, tech.name, date));
    return all;
  }, [allJobs, techs, dateRange]);

  useEffect(() => {
    if (scrollRef.current && (viewMode === 'day' || viewMode === 'week')) {
      setTimeout(() => { scrollRef.current?.scrollTo({ top: Math.max(0, timeToY(new Date().getHours() + ':' + new Date().getMinutes()) - 180), behavior: 'smooth' }); }, 100);
    }
  }, [viewMode]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week' || viewMode === 'timeline') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const updateJob = useCallback(async (jobId: number, updates: Partial<Job>) => {
    const jobs = [...(db.jobs || [])]; const idx = jobs.findIndex(j => j.id === jobId);
    if (idx >= 0) { jobs[idx] = { ...jobs[idx], ...updates }; await saveData({ ...db, jobs }); }
  }, [db, saveData]);

  const createJobDb = useCallback(async (data: Partial<Job>) => {
    const jobs = [...(db.jobs || [])]; const maxId = jobs.reduce((m, j) => Math.max(m, j.id || 0), 0);
    jobs.push({ id: maxId + 1, num: formatJobNumber(maxId + 1), client: data.client || '', phone: data.phone || '', address: data.address || '', desc: data.desc || '', status: (data.status || 'open') as JobStatus, priority: data.priority || 'normal', tech: data.tech || '', techId: data.techId, scheduledDate: data.scheduledDate || '', scheduledTime: data.scheduledTime || '', duration: data.duration || 60, created: new Date().toISOString(), notes: data.notes || '', source: 'schedule' } as Job);
    await saveData({ ...db, jobs });
  }, [db, saveData]);

  const deleteJobDb = useCallback(async (jobId: number) => {
    await saveData({ ...db, jobs: (db.jobs || []).filter(j => j.id !== jobId) });
  }, [db, saveData]);

  const handleDrop = async (date: string, time: string, techName?: string) => {
    if (!dragJob) return;
    const tech = techName ? techs.find(t => t.name === techName) : undefined;
    await updateJob(dragJob.id, { scheduledDate: date, scheduledTime: time, tech: techName || dragJob.tech, techId: tech ? tech.id as number : dragJob.techId, status: techName ? 'assigned' as JobStatus : dragJob.status });
    toast('עבודה הוזזה בהצלחה'); setDragJob(null);
  };

  const handleResize = async (jobId: number, newDuration: number) => {
    await updateJob(jobId, { duration: newDuration });
    toast(Math.floor(newDuration / 60) + ':' + String(newDuration % 60).padStart(2, '0') + ' שעות');
  };

  const handleAutoAssign = async () => {
    const a = autoAssign(unassigned, techs, allJobs);
    if (!a.length) { toast('אין עבודות לשיבוץ'); return; }
    const jobs = [...(db.jobs || [])];
    for (const x of a) { const idx = jobs.findIndex(j => j.id === x.jobId); if (idx >= 0) jobs[idx] = { ...jobs[idx], tech: x.techName, techId: x.techId as number, status: 'assigned' as JobStatus }; }
    await saveData({ ...db, jobs });
    toast(a.length + ' עבודות שובצו');
  };

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') { const d = parseD(fmtD(currentDate)); return DAYS_HE[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1); }
    if (viewMode === 'week' || viewMode === 'timeline') { const s = parseD(dateRange[0]); const e = parseD(dateRange[6] || dateRange[dateRange.length - 1]); return s.getDate() + '/' + (s.getMonth() + 1) + ' — ' + e.getDate() + '/' + (e.getMonth() + 1); }
    return currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, dateRange]);

  const handleQuickAssign = async (job: Job, techName: string) => {
    const tech = techs.find(t => t.name === techName);
    if (!tech) return;
    await updateJob(job.id, { tech: techName, techId: tech.id as number, status: 'assigned' as JobStatus });
    toast(job.client + ' → ' + techName);
  };

  const sidebarContent = (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ScheduleIcon sx={{ fontSize: 18, color: c.accent, mr: 1 }} />
        <Typography sx={{ fontWeight: 800, fontSize: 15, flex: 1 }}>ממתינים לשיבוץ</Typography>
        <Chip label={String(unassigned.length)} size="small" sx={{ bgcolor: 'rgba(255,176,32,0.15)', color: '#FFB020', fontWeight: 700 }} />
        {isMobile && <IconButton size="small" onClick={() => setSidebarOpen(false)} sx={{ ml: 0.5 }}><Close sx={{ fontSize: 16 }} /></IconButton>}
      </Box>
      <Button fullWidth variant="contained" size="small" startIcon={<AutoFixHigh />} onClick={handleAutoAssign} sx={{ mb: 2, bgcolor: c.violet || '#8B5CF6', fontWeight: 700, borderRadius: '8px', height: '100%', '&:hover': { bgcolor: '#7C3AED' } }}>
        שיבוץ אוטומטי (AI)
      </Button>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {unassigned.length === 0 && <Box sx={{ py: 5, textAlign: 'center' }}><Typography sx={{ fontSize: 24, mb: 1 }}>✅</Typography><Typography sx={{ fontSize: 12, color: c.text3 }}>הכל שובץ!</Typography></Box>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {unassigned.map(job => (
            <Paper key={job.id} draggable onDragStart={() => setDragJob(job)} elevation={0} sx={{
              p: '10px', cursor: 'grab', bgcolor: c.glass, border: '1px solid ' + c.border,
              borderRight: '3px solid ' + (PRIORITY[job.priority || 'normal']?.color),
              borderRadius: '8px', height: '100%', transition: 'all 0.15s',
              '&:hover': { bgcolor: c.glass2, borderColor: c.border2 }, '&:active': { cursor: 'grabbing' },
            }}>
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: c.text }}>{job.num} — {job.client}</Typography>
              <Typography sx={{ fontSize: 10, color: c.text3, display: 'flex', alignItems: 'center', gap: '3px', mt: '2px' }}>
                <AccessTime sx={{ fontSize: 10 }} />{jobDate(job) || 'ללא תאריך'} · {jobTime(job)}
              </Typography>
              {job.address && <Typography noWrap sx={{ fontSize: 10, color: c.text3, display: 'flex', alignItems: 'center', gap: '3px' }}><LocationOn sx={{ fontSize: 10 }} />{job.address}</Typography>}
              {/* Quick assign row */}
              <Box sx={{ display: 'flex', gap: '4px', mt: '6px', flexWrap: 'wrap' }}>
                {techs.map((t, ti) => (
                  <Tooltip key={String(t.id)} title={'שבץ ל' + t.name} arrow>
                    <Avatar
                      onClick={(e) => { e.stopPropagation(); handleQuickAssign(job, t.name); }}
                      sx={{
                        width: 22, height: 22, fontSize: 9, fontWeight: 700,
                        bgcolor: tColor(ti) + '30', color: tColor(ti),
                        cursor: 'pointer', border: '1px solid ' + tColor(ti) + '40',
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: tColor(ti), color: '#000', transform: 'scale(1.15)' },
                      }}
                    >{t.name.slice(0, 2)}</Avatar>
                  </Tooltip>
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', direction: 'rtl' }}>

      {/* Desktop: persistent sidebar */}
      {!isMobile && sidebarOpen && (
        <Box sx={{ width: 280, flexShrink: 0, bgcolor: c.surface1, borderLeft: '1px solid ' + c.border, overflow: 'hidden' }}>
          {sidebarContent}
        </Box>
      )}

      {/* Mobile: drawer sidebar */}
      {isMobile && (
        <SwipeableDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} anchor="right"
          PaperProps={{ sx: { width: '85vw', bgcolor: c.surface1, borderLeft: '1px solid ' + c.border, borderRadius: '0 16px 16px 0' } }}>
          {sidebarContent}
        </SwipeableDrawer>
      )}

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <Box sx={{ px: isMobile ? 1 : 2, py: 1, display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flexWrap: 'wrap', borderBottom: '1px solid ' + c.border, bgcolor: c.surface1 }}>
          <IconButton onClick={() => setSidebarOpen(v => !v)} size="small" sx={{ position: 'relative' }}>
            <ScheduleIcon sx={{ fontSize: 20 }} />
            {unassigned.length > 0 && <Box sx={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', bgcolor: '#FFB020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ fontSize: 8, fontWeight: 800, color: '#000' }}>{unassigned.length}</Typography></Box>}
          </IconButton>
          <IconButton onClick={() => navigate(-1)} size="small"><ChevronRight sx={{ fontSize: 18 }} /></IconButton>
          <Button variant="text" size="small" onClick={() => setCurrentDate(new Date())} sx={{ fontSize: 11, fontWeight: 700, color: c.accent, minWidth: 'auto', px: 1 }}>היום</Button>
          <IconButton onClick={() => navigate(1)} size="small"><ChevronLeft sx={{ fontSize: 18 }} /></IconButton>
          <Typography sx={{ fontWeight: 800, fontSize: isMobile ? 13 : 15, fontFamily: "'Rubik', sans-serif", color: c.text, letterSpacing: '-0.3px', minWidth: isMobile ? 'auto' : 140 }}>{headerTitle}</Typography>
          <Box sx={{ flex: 1 }} />
          {!isMobile && (
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.5, border: '1px solid ' + c.border } }}>
              <ToggleButton value="day"><Tooltip title="יום"><ViewDay sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
              <ToggleButton value="week"><Tooltip title="שבוע"><ViewWeek sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
              <ToggleButton value="month"><Tooltip title="חודש"><CalendarMonth sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
              <ToggleButton value="timeline"><Tooltip title="ציר זמן"><ViewTimeline sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
          )}
          {isMobile && (
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ '& .MuiToggleButton-root': { px: 0.7, py: 0.3, fontSize: 10, border: '1px solid ' + c.border } }}>
              <ToggleButton value="day"><Typography sx={{ fontSize: 10, fontWeight: 600 }}>יום</Typography></ToggleButton>
              <ToggleButton value="week"><Typography sx={{ fontSize: 10, fontWeight: 600 }}>שבוע</Typography></ToggleButton>
              <ToggleButton value="month"><Typography sx={{ fontSize: 10, fontWeight: 600 }}>חודש</Typography></ToggleButton>
            </ToggleButtonGroup>
          )}
          <IconButton size="small" onClick={(e) => setFilterAnchor(e.currentTarget)} sx={{ position: 'relative' }}>
            <FilterList sx={{ fontSize: 18 }} />
            {selectedTechs.length < techs.length && selectedTechs.length > 0 && <Box sx={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: '50%', bgcolor: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ fontSize: 7, fontWeight: 800, color: '#000' }}>{selectedTechs.length}</Typography></Box>}
          </IconButton>
          <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
            <MenuItem onClick={() => setSelectedTechs(techs.map(t => t.name))}><Typography sx={{ fontSize: 12, fontWeight: 700 }}>הצג הכל</Typography></MenuItem>
            <Divider />
            {techs.map((tech, ti) => (
              <MenuItem key={String(tech.id)} onClick={() => setSelectedTechs(prev => prev.includes(tech.name) ? prev.filter(n => n !== tech.name) : [...prev, tech.name])}>
                <Checkbox checked={selectedTechs.includes(tech.name)} size="small" sx={{ p: '2px', mr: 0.5 }} />
                <Avatar sx={{ width: 20, height: 20, bgcolor: tColor(ti), fontSize: 9, mr: 0.5 }}>{tech.name[0]}</Avatar>
                <Typography sx={{ fontSize: 12 }}>{tech.name}</Typography>
              </MenuItem>
            ))}
          </Menu>
          <Button variant="contained" size="small" startIcon={!isMobile ? <Add /> : undefined} onClick={() => { setCreateSlot({ date: fmtD(currentDate), time: '09:00' }); setCreateOpen(true); }} sx={{
            bgcolor: '#00E676', color: '#000', fontWeight: 700, borderRadius: '8px', height: '100%', fontSize: 11,
            minWidth: isMobile ? 36 : 'auto', px: isMobile ? 0 : 1.5,
            '&:hover': { bgcolor: '#00C853' },
          }}>
            {isMobile ? <Add sx={{ fontSize: 18 }} /> : 'עבודה חדשה'}
          </Button>
        </Box>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <Box sx={{ mx: isMobile ? 1 : 2, mt: 1, px: '12px', py: '8px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', height: '100%', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>{'⚠ ' + conflicts.length + ' התנגשויות'}</Typography>
            {conflicts.slice(0, 2).map((cc: any, i: number) => <Typography key={i} sx={{ fontSize: 10, color: c.text3 }}>{cc.a.client} ↔ {cc.b.client}</Typography>)}
          </Box>
        )}

        {/* Content */}
        <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', p: isMobile ? 1 : 2 }}>
          {isMobile && viewMode === 'day' && <MobileListView date={fmtD(currentDate)} jobs={filteredJobs} techs={techs.filter(t => selectedTechs.includes(t.name))} onEdit={j => { setEditJob(j); setEditOpen(true); }} />}
          {!isMobile && viewMode === 'day' && <DayView date={fmtD(currentDate)} jobs={filteredJobs} allJobs={allJobs} techs={techs.filter(t => selectedTechs.includes(t.name))} onEdit={(j: Job) => { setEditJob(j); setEditOpen(true); }} onCreate={(d: string, t: string, tn?: string) => { setCreateSlot({ date: d, time: t, tech: tn }); setCreateOpen(true); }} onDragStart={setDragJob} onDrop={handleDrop} onResize={handleResize} />}
          {viewMode === 'week' && <WeekView dates={dateRange} jobs={filteredJobs} techs={techs} onEdit={(j: Job) => { setEditJob(j); setEditOpen(true); }} onCreate={(d: string, t: string) => { setCreateSlot({ date: d, time: t }); setCreateOpen(true); }} onDragStart={setDragJob} onDrop={handleDrop} />}
          {viewMode === 'month' && <MonthView dates={dateRange} curMonth={currentDate.getMonth()} jobs={filteredJobs} techs={techs} onEdit={(j: Job) => { setEditJob(j); setEditOpen(true); }} onDayClick={(d: string) => { setCurrentDate(parseD(d)); setViewMode('day'); }} />}
          {viewMode === 'timeline' && !isMobile && <TimelineView dates={dateRange} jobs={filteredJobs} allJobs={allJobs} techs={techs.filter(t => selectedTechs.includes(t.name))} onEdit={(j: Job) => { setEditJob(j); setEditOpen(true); }} onDragStart={setDragJob} onDrop={handleDrop} />}
        </Box>
      </Box>

      {/* Modals */}
      <EditModal open={editOpen} job={editJob} techs={techs} isMobile={isMobile}
        onClose={() => { setEditOpen(false); setEditJob(null); }}
        onSave={async (data: Partial<Job>) => { if (editJob) { await updateJob(editJob.id, data); toast('עבודה עודכנה'); } setEditOpen(false); setEditJob(null); }}
        onDelete={async () => { if (editJob) { await deleteJobDb(editJob.id); toast('עבודה נמחקה'); } setEditOpen(false); setEditJob(null); }}
      />
      <CreateModal open={createOpen} slot={createSlot} techs={techs} isMobile={isMobile}
        onClose={() => { setCreateOpen(false); setCreateSlot(null); }}
        onSave={async (data: Partial<Job>) => { await createJobDb(data); toast('עבודה נוצרה'); setCreateOpen(false); setCreateSlot(null); }}
      />
    </Box>
  );
}
