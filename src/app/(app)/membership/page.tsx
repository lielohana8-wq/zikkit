'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, TextField, Switch, FormControlLabel, Chip, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Add, Edit, Delete, People, CreditCard, Autorenew, Star } from '@mui/icons-material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatCurrency } from '@/lib/formatters';

interface MemberPlan { id: number; name: string; price: number; period: 'monthly'|'yearly'; features: string[]; active: boolean; color: string }
interface MemberSub { id: number; clientName: string; phone: string; planId: number; startDate: string; nextPayment: string; status: 'active'|'cancelled'|'overdue'; paid: number }

const DEFAULT_PLANS: MemberPlan[] = [
  { id: 1, name: 'בסיסי', price: 99, period: 'monthly', features: ['בדיקה שנתית','10% הנחה על עבודות','תגובה תוך 24 שעות'], active: true, color: '#3B82F6' },
  { id: 2, name: 'פרימיום', price: 199, period: 'monthly', features: ['2 בדיקות שנתיות','20% הנחה','תגובה תוך 4 שעות','עדיפות בתורים','חלקים ללא עלות'], active: true, color: '#F59E0B' },
  { id: 3, name: 'VIP', price: 349, period: 'monthly', features: ['בדיקות ללא הגבלה','30% הנחה','תגובה מיידית','עדיפות מוחלטת','חלקים חינם','טכנאי קבוע'], active: true, color: '#8B5CF6' },
];

export default function MembershipPage() {
  const { db, saveData, cfg } = useData();
  const { toast } = useToast();
  const currency = cfg.currency || 'ILS';
  const [plans, setPlans] = useState<MemberPlan[]>(db.memberPlans || DEFAULT_PLANS);
  const [subs, setSubs] = useState<MemberSub[]>(db.memberSubs || []);
  const [editPlan, setEditPlan] = useState<MemberPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [newSub, setNewSub] = useState<Partial<MemberSub>>({});

  const stats = useMemo(() => ({
    active: subs.filter(s => s.status === 'active').length,
    mrr: subs.filter(s => s.status === 'active').reduce((s, sub) => { const plan = plans.find(p => p.id === sub.planId); return s + (plan?.price || 0); }, 0),
    overdue: subs.filter(s => s.status === 'overdue').length,
  }), [subs, plans]);

  const handleSavePlan = async () => {
    if (!editPlan) return;
    const list = [...plans];
    const idx = list.findIndex(p => p.id === editPlan.id);
    if (idx >= 0) list[idx] = editPlan;
    else list.push({ ...editPlan, id: Math.max(0, ...list.map(p => p.id)) + 1 });
    setPlans(list);
    await saveData({ ...db, memberPlans: list });
    setShowPlanModal(false);
    toast('תוכנית נשמרה');
  };

  const handleAddSub = async () => {
    if (!newSub.clientName) return;
    const sub: MemberSub = { id: Math.max(0, ...subs.map(s => s.id)) + 1, clientName: newSub.clientName || '', phone: newSub.phone || '', planId: newSub.planId || plans[0]?.id || 1, startDate: new Date().toISOString().split('T')[0], nextPayment: '', status: 'active', paid: 0 };
    const list = [...subs, sub];
    setSubs(list);
    await saveData({ ...db, memberSubs: list });
    setShowSubModal(false);
    setNewSub({});
    toast('מנוי נוסף');
  };

  const Stat = ({ label, value, color, icon }: any) => (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', flex: 1, minWidth: 140 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>{icon}<Typography variant="caption" color="text.secondary">{label}</Typography></Box>
      <Typography variant="h4" fontWeight={900} sx={{ color, fontFamily: 'Syne' }}>{value}</Typography>
    </Box>
  );

  return (
    <Box className="zk-fade-up">
      <PageTabs tabs={[{ label: 'דוחות', href: '/reports', icon: '📈' }, { label: 'שכר', href: '/payroll', icon: '💰' }, { label: 'תשלומים', href: '/financing', icon: '💳' }, { label: 'מנויים', href: '/membership', icon: '🏆' }]} />
      <SectionHeader title="מנויים וחוזי שירות" subtitle="ניהול תוכניות מנוי ולקוחות" actions={<Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setShowSubModal(true); setNewSub({}); }} sx={{ bgcolor: '#8B5CF6' }}>מנוי חדש</Button>} />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Stat label="מנויים פעילים" value={stats.active} color="#10B981" icon={<People sx={{ fontSize: 16, color: '#10B981' }} />} />
        <Stat label="הכנסה חודשית" value={formatCurrency(stats.mrr, currency)} color="#3B82F6" icon={<CreditCard sx={{ fontSize: 16, color: '#3B82F6' }} />} />
        <Stat label="באיחור תשלום" value={stats.overdue} color="#EF4444" icon={<Autorenew sx={{ fontSize: 16, color: '#EF4444' }} />} />
      </Box>

      {/* Plans */}
      <Typography fontWeight={700} fontSize={14} sx={{ mb: 1.5 }}>תוכניות מנוי</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {plans.map(p => (
          <Paper key={p.id} sx={{ p: 2.5, borderRadius: 3, border: `2px solid ${p.color}33`, flex: '1 1 200px', minWidth: 200, maxWidth: 300, position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, left: 8 }}><IconButton size="small" onClick={() => { setEditPlan(p); setShowPlanModal(true); }}><Edit sx={{ fontSize: 14 }} /></IconButton></Box>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: `${p.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}><Star sx={{ color: p.color }} /></Box>
            <Typography fontWeight={800} fontSize={16}>{p.name}</Typography>
            <Typography fontWeight={900} fontSize={28} sx={{ fontFamily: 'Syne', color: p.color }}>{formatCurrency(p.price, currency)}<Typography component="span" variant="caption" color="text.secondary">/{p.period === 'monthly' ? 'חודש' : 'שנה'}</Typography></Typography>
            {p.features.map((f, i) => <Typography key={i} variant="body2" sx={{ fontSize: 12, py: 0.3, color: 'text.secondary' }}>✓ {f}</Typography>)}
          </Paper>
        ))}
        <Paper onClick={() => { setEditPlan({ id: 0, name: '', price: 0, period: 'monthly', features: [], active: true, color: '#3B82F6' }); setShowPlanModal(true); }}
          sx={{ p: 2.5, borderRadius: 3, border: '2px dashed rgba(255,255,255,0.1)', flex: '1 1 200px', minWidth: 200, maxWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: 'rgba(255,255,255,0.3)' } }}>
          <Box sx={{ textAlign: 'center' }}><Add sx={{ fontSize: 32, color: 'text.secondary' }} /><Typography variant="body2" color="text.secondary">תוכנית חדשה</Typography></Box>
        </Paper>
      </Box>

      {/* Subscribers */}
      <Typography fontWeight={700} fontSize={14} sx={{ mb: 1.5 }}>מנויים ({subs.length})</Typography>
      {subs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><Typography fontSize={40}>🏆</Typography><Typography fontWeight={700} sx={{ mt: 1 }}>אין מנויים עדיין</Typography><Typography variant="body2" color="text.secondary">הוסף את המנוי הראשון</Typography></Box>
      ) : (
        <Box sx={{ bgcolor: '#0f1318', border: '1px solid rgba(255,255,255,0.055)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable keyExtractor={(s: MemberSub) => s.id} data={subs} columns={[
            { key: 'client', label: 'לקוח', render: (s: MemberSub) => <Typography fontWeight={600} fontSize={12}>{s.clientName}</Typography> },
            { key: 'phone', label: 'טלפון', render: (s: MemberSub) => s.phone || '—' },
            { key: 'plan', label: 'תוכנית', render: (s: MemberSub) => { const p = plans.find(x => x.id === s.planId); return p ? <Chip label={p.name} size="small" sx={{ bgcolor: `${p.color}22`, color: p.color, fontSize: 10 }} /> : '—'; } },
            { key: 'status', label: 'סטטוס', render: (s: MemberSub) => <Badge label={s.status === 'active' ? 'פעיל' : s.status === 'overdue' ? 'באיחור' : 'מבוטל'} variant={s.status === 'active' ? 'green' : s.status === 'overdue' ? 'red' : 'grey'} /> },
            { key: 'start', label: 'מאז', render: (s: MemberSub) => formatDate(s.startDate) },
          ]} />
        </Box>
      )}

      {/* Plan Modal */}
      <ModalBase open={showPlanModal} onClose={() => setShowPlanModal(false)} title={editPlan?.id ? 'עריכת תוכנית' : 'תוכנית חדשה'} footer={<><Button variant="outlined" size="small" onClick={() => setShowPlanModal(false)}>ביטול</Button><Button variant="contained" size="small" onClick={handleSavePlan} sx={{ bgcolor: '#8B5CF6' }}>שמור</Button></>}>
        {editPlan && (<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="שם" value={editPlan.name} onChange={e => setEditPlan({ ...editPlan, name: e.target.value })} fullWidth size="small" />
          <TextField label="מחיר" type="number" value={editPlan.price} onChange={e => setEditPlan({ ...editPlan, price: parseFloat(e.target.value) || 0 })} size="small" />
          <FormControl size="small"><InputLabel>תקופה</InputLabel><Select value={editPlan.period} label="תקופה" onChange={e => setEditPlan({ ...editPlan, period: e.target.value as any })}><MenuItem value="monthly">חודשי</MenuItem><MenuItem value="yearly">שנתי</MenuItem></Select></FormControl>
          <TextField label="פיצ'רים (שורה לכל אחד)" multiline rows={4} value={editPlan.features.join('\n')} onChange={e => setEditPlan({ ...editPlan, features: e.target.value.split('\n').filter(Boolean) })} fullWidth size="small" />
        </Box>)}
      </ModalBase>

      {/* Sub Modal */}
      <ModalBase open={showSubModal} onClose={() => setShowSubModal(false)} title="מנוי חדש" footer={<><Button variant="outlined" size="small" onClick={() => setShowSubModal(false)}>ביטול</Button><Button variant="contained" size="small" onClick={handleAddSub} sx={{ bgcolor: '#10B981' }}>הוסף</Button></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="שם לקוח" value={newSub.clientName || ''} onChange={e => setNewSub({ ...newSub, clientName: e.target.value })} fullWidth size="small" />
          <TextField label="טלפון" value={newSub.phone || ''} onChange={e => setNewSub({ ...newSub, phone: e.target.value })} fullWidth size="small" />
          <FormControl fullWidth size="small"><InputLabel>תוכנית</InputLabel><Select value={newSub.planId || plans[0]?.id || ''} label="תוכנית" onChange={e => setNewSub({ ...newSub, planId: Number(e.target.value) })}>{plans.map(p => <MenuItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price, currency)}/חודש</MenuItem>)}</Select></FormControl>
        </Box>
      </ModalBase>
    </Box>
  );
}
