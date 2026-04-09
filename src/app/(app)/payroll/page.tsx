'use client';

import { useL } from '@/hooks/useL';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, Card, CardContent } from '@mui/material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate, formatPercent, formatJobNumber } from '@/lib/formatters';
import type { Job, User } from '@/types';

type PayPeriod = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

interface TechPayroll {
  tech: User;
  completedJobs: Job[];
  totalRevenue: number;
  totalMaterials: number;
  commissionRate: number;
  commissionAmount: number;
  jobCount: number;
}

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

function getPeriodRange(period: PayPeriod, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'this_week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return { start: d, end: now };
    }
    case 'last_week': {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay() - 7);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: now };
    }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'custom': {
      return {
        start: customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEnd ? new Date(customEnd + 'T23:59:59') : now,
      };
    }
  }
}

export default function PayrollPage() {
  const { db, cfg } = useData();
  const L = useL();
  const { toast } = useToast();
  const [period, setPeriod] = useState<PayPeriod>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showPayslip, setShowPayslip] = useState(false);
  const [selectedTech, setSelectedTech] = useState<TechPayroll | null>(null);
  const currency = cfg.currency || (cfg.region === 'IL' || cfg.lang === 'he' ? 'ILS' : 'USD');

  const techs = useMemo(() => (db.users || []).filter((u) => u.role === 'tech' || u.role === 'technician'), [db.users]);
  const allJobs = db.jobs || [];

  const { start, end } = getPeriodRange(period, customStart, customEnd);

  const techPayrolls = useMemo((): TechPayroll[] => {
    return techs.map((tech) => {
      const completed = allJobs.filter((j) => {
        if (j.tech !== tech.name || j.status !== 'completed') return false;
        const created = new Date(j.created || 0);
        return created >= start && created <= end;
      });
      const totalRevenue = completed.reduce((s, j) => s + (j.revenue || 0), 0);
      const totalMaterials = completed.reduce((s, j) => s + (j.materials || 0), 0);
      const rate = tech.commission || 0;
      const commission = (totalRevenue * rate) / 100;
      return {
        tech, completedJobs: completed, totalRevenue, totalMaterials,
        commissionRate: rate, commissionAmount: commission, jobCount: completed.length,
      };
    }).sort((a, b) => b.commissionAmount - a.commissionAmount);
  }, [techs, allJobs, start, end]);

  const totalPayroll = techPayrolls.reduce((s, t) => s + t.commissionAmount, 0);
  const totalJobs = techPayrolls.reduce((s, t) => s + t.jobCount, 0);
  const totalRevenue = techPayrolls.reduce((s, t) => s + t.totalRevenue, 0);
  const avgCommission = techPayrolls.length > 0 ? totalPayroll / techPayrolls.length : 0;

  const openPayslip = (tp: TechPayroll) => {
    setSelectedTech(tp);
    setShowPayslip(true);
  };

  const periodLabels: Record<PayPeriod, string> = {
    this_week: 'This Week', last_week: L('Last Week','שבוע אחרון'),
    this_month: 'This Month', last_month: L('Last Month','חודש אחרון'), custom: 'Custom Range',
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease' }}>
      <PageTabs tabs={[{ label: 'דוחות', href: '/reports', icon: '📈' }, { label: 'שכר', href: '/payroll', icon: '💰' }, { label: 'תשלומים', href: '/financing', icon: '💳' }, { label: 'מנויים', href: '/membership', icon: '🏆' }]} />
      <SectionHeader title={L('Payroll','שכר ועמלות')} subtitle="Commissions & technician pay" actions={
        <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['this_week', 'last_week', 'this_month', 'last_month', 'custom'] as PayPeriod[]).map((p) => (
            <Button key={p} size="small" onClick={() => setPeriod(p)} sx={{
              px: '12px', py: '5px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto',
              bgcolor: period === p ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
              color: period === p ? '#4F46E5' : '#78716C',
              border: '1px solid ' + (period === p ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
            }}>
              {periodLabels[p]}
            </Button>
          ))}
        </Box>
      } />

      {/* Custom date range */}
      {period === 'custom' && (
        <Box sx={{ display: 'flex', gap: '10px', mb: '16px', alignItems: 'center' }}>
          <Box><Label text={L("From","מתאריך")} /><TextField type="date" size="small" value={customStart} onChange={(e) => setCustomStart(e.target.value)} sx={{ minWidth: 150 }} /></Box>
          <Box><Label text={L("To","עד תאריך")} /><TextField type="date" size="small" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} sx={{ minWidth: 150 }} /></Box>
        </Box>
      )}

      {/* KPI Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', mb: '16px' }}>
        <KpiCard label={L("Total Payroll","סה\"כ שכר")} value={formatCurrency(totalPayroll, currency)} subtitle={techs.length + ' טכנאים'} variant="accent" />
        <KpiCard label={L("Total Revenue","סה\"כ הכנסה")} value={formatCurrency(totalRevenue, currency)} subtitle={totalJobs + ' completed jobs'} variant="green" />
        <KpiCard label={L("Avg Commission","ממוצע עמלה")} value={formatCurrency(avgCommission, currency)} variant="blue" />
        <KpiCard label={L("Jobs Completed","עבודות שהושלמו")} value={String(totalJobs)} variant="teal" />
      </Box>

      {/* Tech Payroll Cards */}
      {techs.length === 0 ? (
        <EmptyState icon="💰" title={L("No Technicians","אין טכנאים")} subtitle={L("Add technicians to see payroll data.","הוסף טכנאים כדי לראות נתוני שכר.")} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {techPayrolls.map((tp) => (
            <Card key={String(tp.tech.id)}>
              <Box sx={{ p: '16px', display: 'flex', alignItems: 'center', gap: '16px', '@media(max-width:768px)': { flexDirection: 'column', alignItems: 'stretch' } }}>
                {/* Tech info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 200 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: tp.commissionAmount > 0 ? 'rgba(79,70,229,0.12)' : 'rgba(0,0,0,0.03)', fontSize: 18,
                  }}>
                    👷
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{tp.tech.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#78716C' }}>
                      {tp.commissionRate}% עמלה · {tp.tech.phone || tp.tech.email || ''}
                    </Typography>
                  </Box>
                </Box>

                {/* Stats */}
                <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', '@media(max-width:768px)': { gridTemplateColumns: '1fr 1fr' } }}>
                  <Box sx={{ textAlign: 'center', p: '8px', bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>{tp.jobCount}</Typography>
                    <Typography sx={{ fontSize: 9, color: '#78716C', fontWeight: 600 }}>JOBS</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: '8px', bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{formatCurrency(tp.totalRevenue, currency)}</Typography>
                    <Typography sx={{ fontSize: 9, color: '#78716C', fontWeight: 600 }}>REVENUE</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: '8px', bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#ff4d6d' }}>{formatCurrency(tp.totalMaterials, currency)}</Typography>
                    <Typography sx={{ fontSize: 9, color: '#78716C', fontWeight: 600 }}>MATERIALS</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: '8px', bgcolor: 'rgba(79,70,229,0.08)', borderRadius: '8px', border: '1px solid rgba(0,229,176,0.2)' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#4F46E5' }}>{formatCurrency(tp.commissionAmount, currency)}</Typography>
                    <Typography sx={{ fontSize: 9, color: '#78716C', fontWeight: 600 }}>COMMISSION</Typography>
                  </Box>
                </Box>

                {/* Actions */}
                <Button size="small" onClick={() => openPayslip(tp)} sx={{
                  fontSize: 11, minWidth: 'auto', p: '6px 14px',
                  bgcolor: 'rgba(79,70,229,0.08)', color: '#4F46E5',
                  border: '1px solid rgba(0,229,176,0.2)', borderRadius: '8px',
                  '&:hover': { bgcolor: '#4F46E5', color: '#000' },
                }}>
                  📄 Payslip
                </Button>
              </Box>

              {/* Job breakdown table */}
              {tp.completedJobs.length > 0 && (
                <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <DataTable<Job>
                    keyExtractor={(j) => j.id}
                    columns={[
                      { key: 'num', label: '#', render: (j) => <Typography sx={{ fontWeight: 700, fontSize: 11 }}>{j.num || formatJobNumber(j.id)}</Typography>, width: 70 },
                      { key: 'client', label: 'לקוח' },
                      { key: 'revenue', label: L('Revenue','הכנסה'), render: (j) => formatCurrency(j.revenue || 0, currency) },
                      { key: 'commission', label: 'עמלה', render: (j) => (
                        <Typography sx={{ fontWeight: 700, color: '#4F46E5', fontSize: 12 }}>
                          {formatCurrency(((j.revenue || 0) * tp.commissionRate) / 100, currency)}
                        </Typography>
                      )},
                      { key: 'created', label: 'תאריך', render: (j) => formatDate(j.created) },
                    ]}
                    data={tp.completedJobs}
                  />
                </Box>
              )}
            </Card>
          ))}
        </Box>
      )}

      {/* Payslip Modal */}
      <ModalBase open={showPayslip} onClose={() => setShowPayslip(false)} title={`Payslip — ${selectedTech?.tech.name || ''}`} maxWidth={500}
        footer={
          <Button size="small" onClick={() => { toast('📋 Payslip copied to clipboard!'); setShowPayslip(false); }}
            sx={{ bgcolor: 'rgba(79,70,229,0.08)', color: '#4F46E5', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#4F46E5', color: '#000' } }}>
            📋 Copy Payslip
          </Button>
        }>
        {selectedTech && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <Box sx={{ bgcolor: 'rgba(79,70,229,0.08)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', p: '14px 16px' }}>
              <Typography sx={{ fontFamily: "'Rubik', sans-serif", fontSize: 14, fontWeight: 800, mb: '6px' }}>
                {cfg.biz_name || 'העסק'} — תלוש שכר
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#A8A29E', lineHeight: 1.8 }}>
                👷 Technician: <strong>{selectedTech.tech.name}</strong><br />
                📅 Period: {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}<br />
                📊 אחוז עמלה: <strong>{selectedTech.commissionRate}%</strong>
              </Typography>
            </Box>

            {/* Breakdown */}
            <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', p: '14px 16px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L("Jobs Completed","עבודות שהושלמו")}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{selectedTech.jobCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L("Total Revenue Generated","סה\"כ הכנסה")}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(selectedTech.totalRevenue, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L("Materials Cost","עלות חומרים")}</Typography>
                <Typography sx={{ fontSize: 12, color: '#ff4d6d' }}>-{formatCurrency(selectedTech.totalMaterials, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
                <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{L("Commission Rate","אחוז עמלה")}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{selectedTech.commissionRate}%</Typography>
              </Box>
              <Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', my: '8px' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{L("Total Pay","סה\"כ תשלום")}</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#4F46E5' }}>{formatCurrency(selectedTech.commissionAmount, currency)}</Typography>
              </Box>
            </Box>

            {/* Job list */}
            {selectedTech.completedJobs.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px', mb: '8px' }}>
                  Job Details
                </Typography>
                {selectedTech.completedJobs.map((j) => (
                  <Box key={j.id} sx={{ display: 'flex', justifyContent: 'space-between', py: '6px', borderBottom: '1px solid rgba(255,255,255,0.035)' }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{j.num || formatJobNumber(j.id)} — {j.client}</Typography>
                      <Typography sx={{ fontSize: 10, color: '#78716C' }}>{formatDate(j.created)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>{formatCurrency(j.revenue || 0, currency)}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#4F46E5' }}>
                        {formatCurrency(((j.revenue || 0) * selectedTech.commissionRate) / 100, currency)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </ModalBase>
    </Box>
  );
}
