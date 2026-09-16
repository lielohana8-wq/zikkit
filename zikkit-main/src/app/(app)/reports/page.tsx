'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';

import { useState, useMemo } from 'react';
import { Box, Button, Typography, Card, CardContent, TextField, Select, MenuItem } from '@mui/material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate, formatPercent, formatJobNumber } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job } from '@/types';

type Period = '7d' | '30d' | '90d' | 'ytd' | 'all';

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

function getDateRange(period: Period): Date {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 86400000);
    case '30d': return new Date(now.getTime() - 30 * 86400000);
    case '90d': return new Date(now.getTime() - 90 * 86400000);
    case 'ytd': return new Date(now.getFullYear(), 0, 1);
    case 'all': return new Date(2020, 0, 1);
  }
}

function Label({ text }: { text: string }) {
  return <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>;
}

export default function ReportsPage() {
  const { db, saveData, cfg } = useData();
  const L = useL();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('30d');
  const currency = cfg.currency || (cfg.region === 'IL' || cfg.lang === 'he' ? 'ILS' : 'USD');

  // Expense management
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState<{ id?: number; date: string; category: string; amount: number; desc: string; vendor: string }>({
    date: new Date().toISOString().slice(0, 10), category: 'office', amount: 0, desc: '', vendor: '',
  });

  const allJobs = db.jobs || [];
  const allLeads = db.leads || [];
  const allExpenses = db.expenses || [];
  const allTechs = (db.users || []).filter((u) => u.role !== 'owner');
  const taxRate = cfg.tax_rate || 0;

  const rangeStart = getDateRange(period);

  const periodJobs = useMemo(() =>
    allJobs.filter((j) => new Date(j.created || 0) >= rangeStart),
  [allJobs, rangeStart]);

  const completedJobs = useMemo(() =>
    periodJobs.filter((j) => j.status === 'completed'),
  [periodJobs]);

  const totalRevenue = completedJobs.reduce((s, j) => s + (j.revenue || 0), 0);
  const totalMaterials = completedJobs.reduce((s, j) => s + (j.materials || 0), 0);
  const totalTax = totalRevenue * (taxRate / 100);
  const totalCommissions = completedJobs.reduce((s, j) => {
    const tech = allTechs.find((t) => t.name === j.tech);
    return s + ((j.revenue || 0) * ((tech?.commission || 0) / 100));
  }, 0);
  const totalProfit = totalRevenue - totalMaterials - totalTax - totalCommissions;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgJobRevenue = completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0;
  const completionRate = periodJobs.length > 0 ? (completedJobs.length / periodJobs.length) * 100 : 0;
  const periodExpenses = allExpenses.filter((e) => new Date(e.date) >= rangeStart).reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalProfit - periodExpenses;

  const revenueChart = useMemo(() => {
    const now = Date.now();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 12;
    const isMonthly = period === '90d' || period === 'ytd' || period === 'all';
    const results: { label: string; revenue: number; profit: number }[] = [];

    if (isMonthly) {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const rev = completedJobs.filter((j) => (j.created || '').startsWith(monthKey)).reduce((s, j) => s + (j.revenue || 0), 0);
        const mat = completedJobs.filter((j) => (j.created || '').startsWith(monthKey)).reduce((s, j) => s + (j.materials || 0), 0);
        results.push({ label, revenue: rev, profit: rev - mat });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        const label = period === '7d'
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const rev = completedJobs.filter((j) => (j.created || '').startsWith(key)).reduce((s, j) => s + (j.revenue || 0), 0);
        const mat = completedJobs.filter((j) => (j.created || '').startsWith(key)).reduce((s, j) => s + (j.materials || 0), 0);
        results.push({ label, revenue: rev, profit: rev - mat });
      }
    }
    return results;
  }, [completedJobs, period]);

  const maxChartVal = Math.max(...revenueChart.map((d) => d.revenue), 1);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    periodJobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count, pct: periodJobs.length > 0 ? (count / periodJobs.length) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [periodJobs]);

  const techPerformance = useMemo(() => {
    const map: Record<string, { name: string; jobs: number; revenue: number; materials: number }> = {};
    completedJobs.forEach((j) => {
      const name = j.tech || L('Unassigned','לא שויך');
      if (!map[name]) map[name] = { name, jobs: 0, revenue: 0, materials: 0 };
      map[name].jobs++;
      map[name].revenue += j.revenue || 0;
      map[name].materials += j.materials || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [completedJobs]);

  const revenueBySource = useMemo(() => {
    const map: Record<string, { source: string; jobs: number; revenue: number }> = {};
    completedJobs.forEach((j) => {
      const src = j.source || 'direct';
      if (!map[src]) map[src] = { source: src, jobs: 0, revenue: 0 };
      map[src].jobs++;
      map[src].revenue += j.revenue || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [completedJobs]);

  const topJobs = useMemo(() =>
    [...completedJobs].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 8),
  [completedJobs]);

  const periodLeads = useMemo(() =>
    allLeads.filter((l) => new Date(l.created || 0) >= rangeStart),
  [allLeads, rangeStart]);
  const convertedLeads = periodLeads.filter((l) => l.status === 'converted').length;
  const leadConversion = periodLeads.length > 0 ? (convertedLeads / periodLeads.length) * 100 : 0;

  const periodLabels: Record<Period, string> = { '7d': L('Last 7 Days','7 ימים אחרונים'), '30d': L('Last 30 Days','30 ימים אחרונים'), '90d': L('Last 90 Days','90 ימים אחרונים'), 'ytd': L('Year to Date','מתחילת השנה'), 'all': L('All Time','הכל') };

  const periodFilteredExpenses = useMemo(() =>
    allExpenses.filter((e) => new Date(e.date) >= rangeStart).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [allExpenses, rangeStart]);

  const handleSaveExpense = async () => {
    if (!editExpense.amount) { toast(L('Enter an amount','הכנס סכום')); return; }
    const expenses = [...(db.expenses || [])];
    if (editExpense.id) {
      const idx = expenses.findIndex((e) => e.id === editExpense.id);
      if (idx >= 0) expenses[idx] = { ...expenses[idx], ...editExpense };
    } else {
      const maxId = expenses.reduce((m, e) => Math.max(m, e.id || 0), 0);
      expenses.push({ ...editExpense, id: maxId + 1 });
    }
    await saveData({ ...db, expenses });
    toast(editExpense.id ? L('Expense updated','הוצאה עודכנה') : L('Expense added','הוצאה נוספה'));
    setShowExpenseModal(false);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm(L('Delete this expense?','למחוק את ההוצאה הזו?'))) return;
    const expenses = (db.expenses || []).filter((e) => e.id !== id);
    await saveData({ ...db, expenses });
    toast(L('Expense deleted','הוצאה נמחקה'));
  };

  const handleExportCSV = () => {
    const headers = [L('Date','תאריך'), L('Job #','מס עבודה'), L('Client','לקוח'), L('Tech','טכנאי'), L('Status','סטטוס'), L('Revenue','הכנסה'), L('Materials','חומרים'), L('Profit','רווח')];
    const rows = periodJobs.map((j) => [
      j.created?.slice(0, 10) || '', j.num || '#' + j.id, j.client || '', j.tech || '',
      lang === 'he' ? (JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.he || j.status) : (JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG]?.label || j.status),
      j.revenue || 0, j.materials || 0, (j.revenue || 0) - (j.materials || 0),
    ]);
    // Add expense rows
    const expHeaders = [L('Date','תאריך'), L('Category','קטגוריה'), L('Amount','סכום'), L('Vendor','ספק'), L('Notes','הערות')];
    const expRows = periodFilteredExpenses.map((e) => [e.date, e.category || '', e.amount || 0, e.vendor || '', e.notes || '']);
    // Summary
    const summary = [
      [''], [L('SUMMARY','סיכום')],
      [L('Total Revenue','סה כ הכנסה'), totalRevenue],
      [L('Total Materials','סה כ חומרים'), totalMaterials],
      [L('Total Expenses','סה כ הוצאות'), periodExpenses],
      [L('Net Profit','רווח נקי'), netProfit],
      [L('Profit Margin','מרווח רווח'), formatPercent(profitMargin)],
      [L('Period','תקופה'), periodLabels[period]],
    ];
    try {
      const allRows = [headers, ...rows, [''], expHeaders, ...expRows, ...summary];
      const csvContent = allRows.map(function(r) { return r.map(function(c) { return String(c); }).join(','); }).join(String.fromCharCode(10));
      const bom = String.fromCharCode(0xFEFF);
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zikkit-report-' + period + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast(L('Report exported!','הדוח יוצא!'));
    } catch (e) { toast('שגיאת ייצוא'); }
  };

  return (
    <Box className="zk-fade-up">
      <PageTabs tabs={[{ label: 'דוחות', href: '/reports', icon: '📈' }, { label: 'שכר', href: '/payroll', icon: '💰' }, { label: 'תשלומים', href: '/financing', icon: '💳' }, { label: 'מנויים', href: '/membership', icon: '🏆' }]} />
      <SectionHeader title={L('Reports','דוחות')} subtitle={L('Financial reports & analytics','דוחות כספיים ואנליטיקות')} actions={
        <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['7d', '30d', '90d', 'ytd', 'all'] as Period[]).map((p) => (
            <Button key={p} size="small" onClick={() => setPeriod(p)} sx={{
              px: '12px', py: '5px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto',
              bgcolor: period === p ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
              color: period === p ? '#4F46E5' : '#78716C',
              border: '1px solid ' + (period === p ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
            }}>
              {p === 'ytd' ? L('YTD','מתחילת השנה') : p === 'all' ? L('All','הכל') : p}
            </Button>
          ))}
          <Button size="small" onClick={handleExportCSV} sx={{
            px: '12px', py: '5px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto',
            bgcolor: 'rgba(79,143,255,0.08)', color: '#4f8fff',
            border: '1px solid rgba(79,143,255,0.2)',
          }}>
            {L('📥 Export CSV','📥 ייצוא CSV')}
          </Button>
        </Box>
      } />

      {/* KPI Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', mb: '16px' }}>
        <KpiCard label={L("Total Revenue","סה\"כ הכנסה")} value={formatCurrency(totalRevenue, currency)} subtitle={completedJobs.length + L(' completed jobs',' עבודות שהושלמו')} variant="green" />
        <KpiCard label={L("Net Profit","רווח נקי")} value={formatCurrency(netProfit, currency)} subtitle={`${formatPercent(profitMargin)} ${L('margin','מרווח')}`} variant="accent" />
        <KpiCard label={L("Avg Job Revenue","ממוצע לעבודה")} value={formatCurrency(avgJobRevenue, currency)} variant="blue" />
        <KpiCard label={L("Completion Rate","אחוז השלמה")} value={formatPercent(completionRate)} subtitle={`${completedJobs.length} / ${periodJobs.length} ${L('jobs','עבודות')}`} variant="teal" />
        <KpiCard label={L("Materials Cost","עלות חומרים")} value={formatCurrency(totalMaterials, currency)} variant="warm" />
        <KpiCard label={L("Lead Conversion","המרת לידים")} value={formatPercent(leadConversion)} subtitle={`${convertedLeads} / ${periodLeads.length} ${L('leads','לידים')}`} variant="purple" />
      </Box>

      {/* Row 1: Revenue Chart + Status Breakdown */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', mb: '12px', '@media(max-width:768px)': { gridTemplateColumns: '1fr !important' } }}>
        <Card>
          <CardHeader icon="💰" title={`${L('Revenue','הכנסה')} — ${periodLabels[period]}`} action={
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{formatCurrency(totalRevenue, currency)}</Typography>
          } />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 140 }}>
              {revenueChart.map((d, i) => (
                <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <Typography sx={{ fontSize: 8, color: '#A8A29E', fontWeight: 600 }}>
                    {d.revenue > 0 ? formatCurrency(d.revenue, currency) : ''}
                  </Typography>
                  <Box sx={{
                    width: '100%', borderRadius: '3px 3px 0 0',
                    height: Math.max(2, (d.revenue / maxChartVal) * 90),
                    background: d.revenue > 0 ? 'linear-gradient(180deg, #4F46E5, #4F46E5)' : 'rgba(0,0,0,0.03)',
                    transition: 'height 0.5s ease',
                  }} />
                  <Typography sx={{ fontSize: 8, color: '#78716C', fontWeight: 600 }}>{d.label}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: '16px', mt: '12px', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', background: 'linear-gradient(180deg, #4F46E5, #4F46E5)' }} />
                <Typography sx={{ fontSize: 10, color: '#78716C' }}>{L('Revenue','הכנסה')}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader icon="📊" title={L("Job Status Breakdown","פילוח סטטוס עבודות")} action={
            <Badge label={periodJobs.length + L(' jobs',' עבודות')} variant="accent" />
          } />
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: '#78716C', textAlign: 'center', py: 3 }}>{L("No jobs in this period","אין עבודות בתקופה זו")}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {statusBreakdown.map((item) => {
                  const cfgItem = JOB_STATUS_CONFIG[item.status as keyof typeof JOB_STATUS_CONFIG];
                  return (
                    <Box key={item.status}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                        <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>{lang === 'he' ? cfgItem?.he : cfgItem?.label || item.status}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#A8A29E' }}>{item.count} ({formatPercent(item.pct)})</Typography>
                      </Box>
                      <Box sx={{ height: 6, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%', width: item.pct + '%', borderRadius: '3px',
                          bgcolor: cfgItem?.color === 'green' ? '#22c55e' : cfgItem?.color === 'blue' ? '#4f8fff' : cfgItem?.color === 'warm' ? '#f59e0b' : cfgItem?.color === 'hot' ? '#ff4d6d' : cfgItem?.color === 'purple' ? '#a78bfa' : '#4F46E5',
                          transition: 'width 0.5s ease',
                        }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Row 2: Tech Performance + Revenue by Source */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', mb: '12px', '@media(max-width:768px)': { gridTemplateColumns: '1fr !important' } }}>
        <Card>
          <CardHeader icon="👷" title={L("Technician Performance","ביצועי טכנאים")} />
          <CardContent sx={{ p: '0 !important' }}>
            {techPerformance.length === 0 ? (
              <Typography sx={{ p: 3, textAlign: 'center', fontSize: 12, color: '#78716C' }}>{L("אין עבודות שהושלמו ע״י טכנאים","אין עבודות שהושלמו ע״י טכנאים")}</Typography>
            ) : (
              <Box>
                {techPerformance.map((t, i) => {
                  const profit = t.revenue - t.materials;
                  const margin = t.revenue > 0 ? (profit / t.revenue) * 100 : 0;
                  return (
                    <Box key={t.name} sx={{
                      display: 'flex', alignItems: 'center', gap: '12px', p: '12px 16px',
                      borderBottom: i < techPerformance.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: i === 0 ? 'rgba(79,70,229,0.12)' : 'rgba(0,0,0,0.03)', fontSize: 12,
                      }}>
                        {i === 0 ? '🏆' : '👷'}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{t.name}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#78716C' }}>
                          {t.jobs} {L('jobs','עבודות')} · {formatPercent(margin)} {L('margin','מרווח')}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(t.revenue, currency)}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#78716C' }}>{L('Profit','רווח')}: {formatCurrency(profit, currency)}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader icon="📈" title={L("Revenue by Source","הכנסה לפי מקור")} />
          <CardContent>
            {revenueBySource.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: '#78716C', textAlign: 'center', py: 3 }}>{L("No revenue data","אין נתוני הכנסה")}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {revenueBySource.map((item) => {
                  const pct = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                  const sourceIcons: Record<string, string> = { ai_bot: '🤖', phone: '📞', web: '🌐', referral: '🤝', walk_in: '🚪', lead: '🎯', direct: '📋', manual: '✏️' };
                  return (
                    <Box key={item.source}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                        <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>
                          {sourceIcons[item.source] || '📋'} {item.source}
                        </Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>
                          {formatCurrency(item.revenue, currency)} ({item.jobs})
                        </Typography>
                      </Box>
                      <Box sx={{ height: 6, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%', width: pct + '%', borderRadius: '3px',
                          background: 'linear-gradient(90deg, #4F46E5, #06b6d4)',
                          transition: 'width 0.5s',
                        }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Top Revenue Jobs */}
      <Card sx={{ mb: '12px' }}>
        <CardHeader icon="⭐" title={L("Top Revenue Jobs","עבודות מובילות")} action={<Badge label={topJobs.length + ' jobs'} variant="green" />} />
        <CardContent sx={{ p: '0 !important' }}>
          {topJobs.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center', fontSize: 12, color: '#78716C' }}>{L("אין עבודות עם הכנסה","אין עבודות עם הכנסה")}</Typography>
          ) : (
            <DataTable<Job>
              keyExtractor={(j) => j.id}
              columns={[
                { key: 'num', label: '#', render: (j) => <Typography sx={{ fontWeight: 700, fontSize: 11 }}>{j.num || formatJobNumber(j.id)}</Typography>, width: 70 },
                { key: 'client', label: 'לקוח' },
                { key: 'tech', label: 'טכנאי', render: (j) => j.tech || '—' },
                { key: 'revenue', label: L('Revenue','הכנסה'), render: (j) => <Typography sx={{ fontWeight: 700, color: '#22c55e', fontSize: 12 }}>{formatCurrency(j.revenue || 0, currency)}</Typography> },
                { key: 'materials', label: L('Materials','חומרים'), render: (j) => <Typography sx={{ fontSize: 12, color: '#ff4d6d' }}>{formatCurrency(j.materials || 0, currency)}</Typography> },
                { key: 'profit', label: 'רווח', render: (j) => {
                  const p = (j.revenue || 0) - (j.materials || 0);
                  return <Typography sx={{ fontWeight: 700, fontSize: 12, color: p >= 0 ? '#4F46E5' : '#ff4d6d' }}>{formatCurrency(p, currency)}</Typography>;
                }},
                { key: 'created', label: L('Date','תאריך'), render: (j) => formatDate(j.created) },
              ]}
              data={topJobs}
            />
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader icon="📋" title={L("Financial Summary","סיכום פיננסי")} action={
          <Typography sx={{ fontSize: 11, color: '#78716C' }}>{periodLabels[period]}</Typography>
        } />
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', '@media(max-width:768px)': { gridTemplateColumns: '1fr !important' } }}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '10px', p: '14px' }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px', mb: '8px' }}>{L('Income','הכנסות')}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L("Total Revenue","סה\"כ הכנסה")}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(totalRevenue, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L('Completed Jobs','עבודות שהושלמו')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{completedJobs.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L('Avg Job Value','ממוצע לעבודה')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(avgJobRevenue, currency)}</Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '10px', p: '14px' }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px', mb: '8px' }}>{L('Expenses','הוצאות')}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L('Materials','חומרים')}</Typography>
                <Typography sx={{ fontSize: 12, color: '#ff4d6d' }}>-{formatCurrency(totalMaterials, currency)}</Typography>
              </Box>
              {totalTax > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
                  <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L(`Tax (${taxRate}%)`,`מס (${taxRate}%)`)}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#f59e0b' }}>-{formatCurrency(totalTax, currency)}</Typography>
                </Box>
              )}
              {totalCommissions > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
                  <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L('Commissions','עמלות טכנאים')}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#a78bfa' }}>-{formatCurrency(totalCommissions, currency)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L('Other Expenses','הוצאות אחרות')}</Typography>
                <Typography sx={{ fontSize: 12, color: '#ff4d6d' }}>-{formatCurrency(periodExpenses, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{L('Net Profit','רווח נקי')}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: netProfit >= 0 ? '#4F46E5' : '#ff4d6d' }}>{formatCurrency(netProfit, currency)}</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ══ Expenses Management ══ */}
      <Card>
        <CardHeader icon="💸" title={L("Expenses","הוצאות")} action={
          <Button size="small" onClick={() => {
            setEditExpense({ date: new Date().toISOString().slice(0, 10), category: 'office', amount: 0, desc: '', vendor: '' });
            setShowExpenseModal(true);
          }} sx={{ fontSize: 10, fontWeight: 700, bgcolor: 'rgba(79,70,229,0.08)', color: '#4F46E5', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '8px', px: '12px' }}>
            {L("+ Add Expense","+ הוסף הוצאה")}
          </Button>
        } />
        <CardContent sx={{ p: '0 !important' }}>
          {periodFilteredExpenses.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: '#78716C' }}>{L('No expenses recorded for this period','אין הוצאות בתקופה זו')}</Typography>
            </Box>
          ) : (
            <DataTable
              keyExtractor={(e: typeof periodFilteredExpenses[0]) => String(e.id)}
              columns={[
                { key: 'date', label: L('Date','תאריך'), render: (e: typeof periodFilteredExpenses[0]) => formatDate(e.date) },
                { key: 'category', label: L('Category','קטגוריה'), render: (e: typeof periodFilteredExpenses[0]) => <Badge label={e.category} variant="grey" /> },
                { key: 'vendor', label: L('Vendor','ספק'), render: (e: typeof periodFilteredExpenses[0]) => e.vendor || '—' },
                { key: 'desc', label: L('Description','תיאור'), render: (e: typeof periodFilteredExpenses[0]) => e.desc || '—' },
                { key: 'amount', label: L('Amount','סכום'), render: (e: typeof periodFilteredExpenses[0]) => (
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ff4d6d' }}>-{formatCurrency(e.amount, currency)}</Typography>
                )},
                { key: 'actions', label: '', width: 80, render: (e: typeof periodFilteredExpenses[0]) => (
                  <Box sx={{ display: 'flex', gap: '4px' }}>
                    <Button size="small" onClick={(ev) => { ev.stopPropagation(); setEditExpense({ ...e }); setShowExpenseModal(true); }}
                      sx={{ fontSize: 9, minWidth: 'auto', p: '2px 6px', color: '#4f8fff' }}>{L("Edit","ערוך")}</Button>
                    <Button size="small" onClick={(ev) => { ev.stopPropagation(); handleDeleteExpense(e.id); }}
                      sx={{ fontSize: 9, minWidth: 'auto', p: '2px 6px', color: '#ef4444' }}>✕</Button>
                  </Box>
                )},
              ]}
              data={periodFilteredExpenses}
            />
          )}
        </CardContent>
      </Card>

      {/* Expense Modal */}
      <ModalBase open={showExpenseModal} onClose={() => setShowExpenseModal(false)} title={editExpense.id ? L('Edit Expense','ערוך הוצאה') : L('Add Expense','הוסף הוצאה')}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowExpenseModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button size="small" onClick={handleSaveExpense}
            sx={{ bgcolor: 'rgba(0,229,176,0.1)', color: '#4F46E5', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#4F46E5', color: '#000' } }}>
            {editExpense.id ? L("Update","עדכן") : L("Add","הוסף")}
          </Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Date","תאריך")} /><TextField fullWidth size="small" type="date" value={editExpense.date} onChange={(e) => setEditExpense({ ...editExpense, date: e.target.value })} /></Box>
            <Box><Label text={L("Amount","סכום")} /><TextField fullWidth size="small" type="number" value={editExpense.amount} onChange={(e) => setEditExpense({ ...editExpense, amount: parseFloat(e.target.value) || 0 })} /></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Category","קטגוריה")} /><Select fullWidth size="small" value={editExpense.category} onChange={(e) => setEditExpense({ ...editExpense, category: e.target.value })}>
              <MenuItem value="office">{L("🏢 Office","🏢 משרד")}</MenuItem>
              <MenuItem value="fuel">{L("⛽ Fuel / Gas","⛽ דלק")}</MenuItem>
              <MenuItem value="tools">{L("🔧 Tools","🔧 כלים")}</MenuItem>
              <MenuItem value="parts">{L("📦 Parts","📦 חלקים")}</MenuItem>
              <MenuItem value="insurance">{L("🛡️ Insurance","🛡️ ביטוח")}</MenuItem>
              <MenuItem value="rent">{L("🏠 Rent","🏠 שכירות")}</MenuItem>
              <MenuItem value="marketing">{L("📣 Marketing","📣 שיווק")}</MenuItem>
              <MenuItem value="software">{L("💻 Software","💻 תוכנה")}</MenuItem>
              <MenuItem value="vehicle">{L("🚗 Vehicle","🚗 רכב")}</MenuItem>
              <MenuItem value="salary">{L("💰 Salary","💰 משכורת")}</MenuItem>
              <MenuItem value="other">{L("📋 Other","📋 אחר")}</MenuItem>
            </Select></Box>
            <Box><Label text={L("Vendor / Supplier","ספק")} /><TextField fullWidth size="small" value={editExpense.vendor} onChange={(e) => setEditExpense({ ...editExpense, vendor: e.target.value })} /></Box>
          </Box>
          <Box><Label text={L("Description","תיאור")} /><TextField fullWidth size="small" multiline rows={2} value={editExpense.desc} onChange={(e) => setEditExpense({ ...editExpense, desc: e.target.value })} /></Box>
        </Box>
      </ModalBase>
    </Box>
  );
}
