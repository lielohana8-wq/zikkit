'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';
import { useMemo } from 'react';
import { Box, Typography, Button, LinearProgress, Avatar, Chip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { TrendingUp, People, Work, Phone, Add, ArrowForward, Schedule, Star } from '@mui/icons-material';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { zikkitColors as c } from '@/styles/theme';
import { formatCurrency } from '@/lib/formatters';
import type { Job } from '@/types';
import { generateSmartAlerts } from '@/lib/smart-alerts';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { db, cfg } = useData();
  const L = useL();
  const { lang } = useLanguage();
  const currency = cfg.currency || (lang === 'he' ? 'ILS' : 'USD');

  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const dayMs = 86400000;

  const allJobs: Job[] = db.jobs || [];
  const allLeads = db.leads || [];
  const techs = useMemo(() => (db.users || []).filter((u: any) => u.role === 'tech' || u.role === 'technician'), [db.users]);

  // Stats
  const openJobs = allJobs.filter(j => !['completed', 'cancelled'].includes(j.status)).length;
  const completedJobs = allJobs.filter(j => j.status === 'completed').length;
  const newLeads = allLeads.filter((l: any) => l.status === 'new' || l.status === 'hot').length;
  const botCalls = (db.botLog || []).length;

  const monthRevenue = useMemo(() => {
    const ms = new Date(); ms.setDate(1); ms.setHours(0,0,0,0);
    return allJobs.filter(j => j.status === 'completed' && new Date(j.created || 0) >= ms).reduce((s, j) => s + (j.revenue || 0), 0);
  }, [allJobs]);

  const weekRevenue = useMemo(() => {
    return allJobs.filter(j => j.status === 'completed' && (now - new Date(j.created || 0).getTime()) < 7 * dayMs).reduce((s, j) => s + (j.revenue || 0), 0);
  }, [allJobs, now]);

  // Revenue chart
  const revenueByDay = useMemo(() => {
    const days: { label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      const dayNames = ['א','ב','ג','ד','ה','ו','ש'];
      const label = lang === 'he' ? dayNames[d.getDay()] : d.toLocaleDateString('en-US', { weekday: 'short' });
      const rev = allJobs.filter(j => j.status === 'completed' && (j.created || '').startsWith(key)).reduce((s, j) => s + (j.revenue || 0), 0);
      days.push({ label, revenue: rev });
    }
    return days;
  }, [allJobs, now, lang]);

  const maxRev = Math.max(...revenueByDay.map(d => d.revenue), 1);

  // Alerts
  const unassigned = allJobs.filter(j => !j.tech && !['completed', 'cancelled'].includes(j.status));
  const newLeadsList = allLeads.filter((l: any) => l.status === 'new');
  const overdueJobs = allJobs.filter(j => !['completed', 'cancelled'].includes(j.status) && (now - new Date(j.created || 0).getTime()) > 2 * dayMs);

  // Today schedule
  const todayJobs = useMemo(() =>
    allJobs.filter(j => { const d = j.scheduledDate || j.date || j.created || ''; return d.startsWith(today) && !['completed', 'cancelled'].includes(j.status); }).slice(0, 6),
  [allJobs, today]);

  // Top techs
  const topTechs = useMemo(() => {
    const ms = new Date(); ms.setDate(1); ms.setHours(0,0,0,0);
    const counts: Record<string, { name: string; jobs: number; revenue: number }> = {};
    allJobs.forEach(j => {
      if (j.status === 'completed' && j.tech && new Date(j.created || 0) >= ms) {
        if (!counts[j.tech]) counts[j.tech] = { name: j.tech, jobs: 0, revenue: 0 };
        counts[j.tech].jobs++;
        counts[j.tech].revenue += j.revenue || 0;
      }
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [allJobs]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';
  const dateStr = new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' });
  const smartAlerts = generateSmartAlerts(allJobs, allLeads, cfg);
  const alerts = smartAlerts.length;

  // Goal
  const goal = (cfg as any).monthlyGoal || 0;
  const goalPct = goal > 0 ? Math.min(Math.round((monthRevenue / goal) * 100), 100) : 0;

  return (
    <Box className="zk-fade-up" sx={{ pb: 10 }}>
      {/* Greeting */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 900, color: c.text, lineHeight: 1.2 }}>
            {greeting}, {user?.name?.split(' ')[0] || 'בוס'} 👋
          </Typography>
          <Typography sx={{ fontSize: 13, color: c.text3, mt: 0.5 }}>{dateStr}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[
            { label: '+ עבודה', href: '/jobs', color: c.accent, icon: <Work sx={{ fontSize: 14 }} /> },
            { label: '+ ליד', href: '/leads', color: c.blue, icon: <People sx={{ fontSize: 14 }} /> },
            { label: '+ הצעה', href: '/quotes', color: c.violet || c.purple, icon: <Add sx={{ fontSize: 14 }} /> },
          ].map(a => (
            <Button key={a.label} onClick={() => router.push(a.href)} startIcon={a.icon} size="small"
              sx={{ bgcolor: `${a.color}12`, color: a.color, fontWeight: 700, fontSize: 11, borderRadius: 2, border: `1px solid ${a.color}25`, '&:hover': { bgcolor: `${a.color}22` } }}>
              {a.label}
            </Button>
          ))}
        </Box>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
        {[
          { label: 'הכנסות החודש', value: formatCurrency(monthRevenue, currency), color: c.accent, icon: <TrendingUp />, sub: goal > 0 ? `${goalPct}% מהיעד` : undefined },
          { label: 'עבודות פתוחות', value: String(openJobs), color: c.blue, icon: <Work />, sub: `${completedJobs} הושלמו` },
          { label: 'לידים חדשים', value: String(newLeads), color: c.warm || '#FFB020', icon: <People />, sub: `${allLeads.length} סה״כ` },
          { label: 'שיחות בוט', value: String(botCalls), color: c.violet || c.purple, icon: <Phone />, sub: techs.length + ' טכנאים' },
        ].map((s, i) => (
          <Box key={i} sx={{
            p: 2.5, borderRadius: 3,
            background: `linear-gradient(135deg, ${c.surface2}DD, ${c.surface1}EE)`,
            border: `1px solid ${c.border}`,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s',
            '&:hover': { borderColor: `${s.color}40`, transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${s.color}15` },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </Box>
              <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600 }}>{s.label}</Typography>
            </Box>
            <Typography sx={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</Typography>
            {s.sub && <Typography sx={{ fontSize: 10, color: c.text3, mt: 0.3 }}>{s.sub}</Typography>}
          </Box>
        ))}
      </Box>

      {/* Main Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        {/* Revenue Chart */}
        <Box sx={{ p: 2.5, borderRadius: 3, background: `linear-gradient(135deg, ${c.surface2}DD, ${c.surface1}EE)`, border: `1px solid ${c.border}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>📊 הכנסות שבועיות</Typography>
              <Typography sx={{ fontSize: 10, color: c.text3 }}>7 ימים אחרונים</Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: c.green || '#22c55e' }}>{formatCurrency(weekRevenue, currency)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 120 }}>
            {revenueByDay.map((d, i) => (
              <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{
                  width: '100%', borderRadius: '8px 8px 2px 2px', minHeight: 4,
                  height: `${Math.max((d.revenue / maxRev) * 100, 4)}%`,
                  background: d.revenue > 0 ? `linear-gradient(180deg, ${c.accent}, ${c.accent}88)` : c.glass2,
                  transition: 'height 0.6s cubic-bezier(0.22,1,0.36,1)',
                  '&:hover': { filter: 'brightness(1.3)', transform: 'scaleY(1.05)' },
                }} />
                <Typography sx={{ fontSize: 10, color: c.text3, fontWeight: 600 }}>{d.label}</Typography>
              </Box>
            ))}
          </Box>
          {goal > 0 && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${c.border}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: c.text3 }}>יעד חודשי</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: goalPct >= 100 ? (c.green || '#22c55e') : c.text2 }}>{goalPct}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={goalPct} sx={{ height: 6, borderRadius: 3, bgcolor: c.glass2, '& .MuiLinearProgress-bar': { bgcolor: goalPct >= 100 ? (c.green || '#22c55e') : c.accent, borderRadius: 3 } }} />
            </Box>
          )}
        </Box>

        {/* Alerts */}
        <Box sx={{ p: 2.5, borderRadius: 3, background: `linear-gradient(135deg, ${c.surface2}DD, ${c.surface1}EE)`, border: `1px solid ${c.border}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>🔥 דורש טיפול {alerts > 0 && <Chip label={alerts} size="small" sx={{ bgcolor: `${c.hot || '#ff4d6d'}15`, color: c.hot || '#ff4d6d', fontWeight: 800, fontSize: 10, ml: 1, height: 20 }} />}</Typography>
          {smartAlerts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ fontSize: 32, mb: 1 }}>✅</Typography>
              <Typography sx={{ fontSize: 13, color: c.text3 }}>הכל מטופל! אין דברים דחופים.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflow: 'auto' }}>
              {smartAlerts.map(alert => (
                <Box key={alert.id} onClick={() => alert.actionHref && router.push(alert.actionHref)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: `${alert.color}08`, border: `1px solid ${alert.color}18`, cursor: alert.actionHref ? 'pointer' : 'default', transition: 'all 0.2s', '&:hover': alert.actionHref ? { bgcolor: `${alert.color}14`, transform: 'translateX(-2px)' } : {} }}>
                  <Typography sx={{ fontSize: 16 }}>{alert.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: alert.color }}>{alert.title}</Typography>
                    <Typography sx={{ fontSize: 10, color: c.text3 }}>{alert.message}</Typography>
                  </Box>
                  {alert.actionLabel && <Chip label={alert.actionLabel} size="small" sx={{ fontSize: 9, height: 20, bgcolor: `${alert.color}15`, color: alert.color }} />}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Bottom Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* Today Schedule */}
        <Box sx={{ p: 2.5, borderRadius: 3, background: `linear-gradient(135deg, ${c.surface2}DD, ${c.surface1}EE)`, border: `1px solid ${c.border}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>📅 לוח זמנים להיום <Chip label={todayJobs.length} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: `${c.accent}15`, color: c.accent, ml: 1 }} /></Typography>
            <Button size="small" onClick={() => router.push('/schedule')} sx={{ fontSize: 11, color: c.accent, fontWeight: 600 }}>הצג הכל</Button>
          </Box>
          {todayJobs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography sx={{ fontSize: 28, mb: 1 }}>📭</Typography>
              <Typography sx={{ fontSize: 12, color: c.text3 }}>אין עבודות מתוכננות להיום</Typography>
            </Box>
          ) : todayJobs.map(j => (
            <Box key={j.id} sx={{ display: 'flex', gap: 1.5, p: '10px 0', borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 'none' } }}>
              <Box sx={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: c.accent }}>{j.scheduledTime || j.time || '--:--'}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{j.client}</Typography>
                <Typography sx={{ fontSize: 11, color: c.text3 }}>{j.address || j.desc || ''}</Typography>
              </Box>
              {j.tech && <Chip label={j.tech} size="small" sx={{ fontSize: 10, height: 22 }} />}
            </Box>
          ))}
        </Box>

        {/* Top Techs */}
        <Box sx={{ p: 2.5, borderRadius: 3, background: `linear-gradient(135deg, ${c.surface2}DD, ${c.surface1}EE)`, border: `1px solid ${c.border}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>🏆 טכנאים מובילים</Typography>
            <Button size="small" onClick={() => router.push('/technicians')} sx={{ fontSize: 11, color: c.accent, fontWeight: 600 }}>הצג הכל</Button>
          </Box>
          {topTechs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography sx={{ fontSize: 28, mb: 1 }}>👷</Typography>
              <Typography sx={{ fontSize: 12, color: c.text3 }}>אין עבודות שהושלמו החודש</Typography>
            </Box>
          ) : topTechs.map((t, i) => (
            <Box key={t.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '8px 0', borderBottom: `1px solid ${c.border}`, '&:last-child': { borderBottom: 'none' } }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 800, bgcolor: i === 0 ? `${c.accent}25` : c.glass2, color: i === 0 ? c.accent : c.text3 }}>
                {i === 0 ? '🥇' : i + 1}
              </Avatar>
              <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.name}</Typography>
              <Box sx={{ textAlign: 'left' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: c.green || '#22c55e' }}>{formatCurrency(t.revenue, currency)}</Typography>
                <Typography sx={{ fontSize: 10, color: c.text3 }}>{t.jobs} עבודות</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
