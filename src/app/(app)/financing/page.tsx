'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, TextField, Switch, FormControlLabel, Chip, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { CreditCard, Payments, Receipt, Settings } from '@mui/icons-material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatCurrency } from '@/lib/formatters';

export default function FinancingPage() {
  const { db, cfg } = useData();
  const { toast } = useToast();
  const currency = cfg.currency || 'ILS';
  const [tapToPayEnabled, setTapToPayEnabled] = useState(true);
  const [installmentsEnabled, setInstallmentsEnabled] = useState(true);
  const [maxInstallments, setMaxInstallments] = useState(12);

  const payments = useMemo(() => (db.payments || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()), [db.payments]);
  const totalCollected = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0);
  const pending = payments.filter((p: any) => p.status === 'pending');

  const Stat = ({ label, value, color, icon }: any) => (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', flex: 1, minWidth: 140 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>{icon}<Typography variant="caption" color="text.secondary">{label}</Typography></Box>
      <Typography variant="h5" fontWeight={900} sx={{ fontFamily: 'Syne', color }}>{value}</Typography>
    </Box>
  );

  return (
    <Box className="zk-fade-up">
      <PageTabs tabs={[{ label: 'דוחות', href: '/reports', icon: '📈' }, { label: 'שכר', href: '/payroll', icon: '💰' }, { label: 'תשלומים', href: '/financing', icon: '💳' }, { label: 'מנויים', href: '/membership', icon: '🏆' }]} />
      <SectionHeader title="תשלומים ומימון" subtitle="Tap to Pay, תשלומים, הגבייה" />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Stat label="נגבה" value={formatCurrency(totalCollected, currency)} color="#10B981" icon={<CreditCard sx={{ fontSize: 16, color: '#10B981' }} />} />
        <Stat label="ממתין" value={formatCurrency(pending.reduce((s: number, p: any) => s + p.amount, 0), currency)} color="#F59E0B" icon={<Payments sx={{ fontSize: 16, color: '#F59E0B' }} />} />
        <Stat label="עסקאות" value={payments.length} color="#3B82F6" icon={<Receipt sx={{ fontSize: 16, color: '#3B82F6' }} />} />
      </Box>

      {/* Settings */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography fontWeight={700} fontSize={14} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><Settings fontSize="small" />הגדרות תשלום</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel control={<Switch checked={tapToPayEnabled} onChange={e => { setTapToPayEnabled(e.target.checked); toast(e.target.checked ? 'Tap to Pay הופעל' : 'Tap to Pay כובה'); }} color="success" />} label="📱 Tap to Pay — תשלום במקום (Stripe/PayPlus)" />
          <FormControlLabel control={<Switch checked={installmentsEnabled} onChange={e => setInstallmentsEnabled(e.target.checked)} color="success" />} label="💳 תשלומים — אפשר ללקוח לפרוס" />
          {installmentsEnabled && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 4 }}>
              <Typography variant="body2">מקסימום תשלומים:</Typography>
              <Select value={maxInstallments} onChange={e => setMaxInstallments(Number(e.target.value))} size="small" sx={{ width: 100 }}>
                {[2,3,4,6,8,10,12].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </Box>
          )}
          <Box><Typography fontWeight={600} fontSize={12} sx={{ mb: 0.5 }}>🔗 חיבור ספק תשלום</Typography>
            <TextField fullWidth size="small" placeholder="Stripe / PayPlus API Key" type="password" sx={{ maxWidth: 400 }} />
          </Box>
        </Box>
      </Paper>

      {/* Payments Table */}
      <Typography fontWeight={700} fontSize={14} sx={{ mb: 1.5 }}>היסטוריית תשלומים</Typography>
      {payments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><Typography fontSize={40}>💳</Typography><Typography fontWeight={700} sx={{ mt: 1 }}>אין תשלומים עדיין</Typography><Typography variant="body2" color="text.secondary">תשלומים יופיעו כאן אחרי גבייה ראשונה</Typography></Box>
      ) : (
        <Box sx={{ bgcolor: '#0f1318', border: '1px solid rgba(255,255,255,0.055)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable keyExtractor={(p: any) => p.id} data={payments} columns={[
            { key: 'client', label: 'לקוח', render: (p: any) => <Typography fontWeight={600} fontSize={12}>{p.client}</Typography> },
            { key: 'amount', label: 'סכום', render: (p: any) => <Typography fontWeight={700} fontSize={12} sx={{ color: '#10B981' }}>{formatCurrency(p.amount, currency)}</Typography> },
            { key: 'method', label: 'אמצעי', render: (p: any) => <Chip label={p.method || 'אשראי'} size="small" sx={{ fontSize: 10 }} /> },
            { key: 'installments', label: 'תשלומים', render: (p: any) => p.installments ? `${p.installmentsPaid || 1}/${p.installments}` : '1/1' },
            { key: 'status', label: 'סטטוס', render: (p: any) => <Badge label={p.status === 'paid' ? 'שולם' : p.status === 'pending' ? 'ממתין' : 'נכשל'} variant={p.status === 'paid' ? 'green' : p.status === 'pending' ? 'yellow' : 'red'} /> },
            { key: 'date', label: 'תאריך', render: (p: any) => formatDate(p.date) },
          ]} />
        </Box>
      )}
    </Box>
  );
}
