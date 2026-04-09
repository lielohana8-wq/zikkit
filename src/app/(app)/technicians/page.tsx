'use client';

import { useL } from '@/hooks/useL';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, Select, MenuItem } from '@mui/material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatCurrency } from '@/lib/formatters';
import { zikkitColors as c } from '@/styles/theme';
import type { User } from '@/types';

interface TechWithStats extends User {
  jobsCompleted: number;
  totalRevenue: number;
  activeJobs: number;
  isActive: boolean;
}

export default function TechniciansPage() {
  const { db, saveData, cfg } = useData();
  const L = useL();
  const { toast } = useToast();
  const { sendPasswordReset } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editTech, setEditTech] = useState<Partial<User>>({});
  const [search, setSearch] = useState('');
  const currency = cfg.currency || (cfg.region === 'IL' || cfg.lang === 'he' ? 'ILS' : 'USD');

  const techsWithStats = useMemo((): TechWithStats[] => {
    const allTechs = (db.users || []).filter((u) => u.role === 'tech' || u.role === 'technician');
    const allJobs = db.jobs || [];
    return allTechs.map((t) => {
      const myJobs = allJobs.filter((j) => j.tech === t.name);
      const completed = myJobs.filter((j) => j.status === 'completed');
      const active = myJobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
      const hasRecentActivity = myJobs.some((j) => {
        const d = new Date(j.created || 0);
        return Date.now() - d.getTime() < 30 * 86400000; // 30 days
      });
      return {
        ...t,
        jobsCompleted: completed.length,
        totalRevenue: completed.reduce((s, j) => s + (j.revenue || 0), 0),
        activeJobs: active.length,
        isActive: hasRecentActivity || active.length > 0,
      };
    });
  }, [db.users, db.jobs]);

  const techs = useMemo(() => {
    if (!search) return techsWithStats;
    const q = search.toLowerCase();
    return techsWithStats.filter((t) => t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.phone?.includes(q));
  }, [techsWithStats, search]);

  const openNew = () => {
    setEditTech({ name: '', email: '', phone: '', zip: '', role: 'technician', commission: 0 });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editTech.name?.trim()) { toast('Enter technician name', c.hot); return; }
    if (!editTech.email?.trim()) { toast('Enter email address', c.hot); return; }

    const users = [...(db.users || [])];
    if (editTech.id) {
      const idx = users.findIndex((u) => u.id === editTech.id);
      if (idx >= 0) users[idx] = { ...users[idx], ...editTech } as User;
    } else {
      const maxId = users.reduce((m, u) => Math.max(m, typeof u.id === 'number' ? u.id : 0), 0);
      const newTech: User = {
        id: maxId + 1,
        name: editTech.name || '',
        email: editTech.email || '',
        role: 'technician',
        phone: editTech.phone || '',
        zip: editTech.zip || '',
        commission: editTech.commission || 0,
        mustChangePassword: true,
      };
      users.push(newTech);
    }
    await saveData({ ...db, users });
    setShowModal(false);
    toast(editTech.id ? '✅ Technician updated!' : '✅ Technician added!');
  };

  const handleResetPassword = async (tech: User) => {
    if (!tech.email) { toast('אין כתובת אימייל לטכנאי זה', '#ff4d6d'); return; }
    try {
      await sendPasswordReset(tech.email);
      // Set mustChangePassword flag
      const users = [...(db.users || [])];
      const idx = users.findIndex((u) => u.id === tech.id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], mustChangePassword: true };
        await saveData({ ...db, users });
      }
      toast('✅ Password reset email sent to ' + tech.email);
    } catch (e) {
      toast((e as Error).message, '#ff4d6d');
    }
  };

  const handleDelete = async (tech: User) => {
    if (!confirm('Remove ' + tech.name + '?')) return;
    const users = (db.users || []).filter((u) => u.id !== tech.id);
    await saveData({ ...db, users });
    toast('Technician removed');
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <PageTabs tabs={[{ label: 'טכנאים', href: '/technicians', icon: '👷' }, { label: 'משתמשים', href: '/users', icon: '🔐' }]} />
      <SectionHeader title={L('Technicians','טכנאים')} subtitle={techs.length + ' טכנאים'} actions={
        <Button variant="contained" size="small" onClick={openNew}>{L('+ הוסף טכנאי','+ הוסף טכנאי')}</Button>
      } />

      <Box sx={{ mb: '16px' }}>
        <TextField placeholder={L("Search technicians...","חפש טכנאים...")} value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 260 }} />
      </Box>

      {techs.length === 0 ? (
        <EmptyState icon="👷" title={L("No Technicians","אין טכנאים")} subtitle={L("Add your first technician.","הוסף את הטכנאי הראשון שלך.")} actionLabel={L("+ Add Technician","+ הוסף טכנאי")} onAction={openNew} />
      ) : (
        <Box sx={{ bgcolor: c.surface2, border: '1px solid ' + c.border, borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<TechWithStats>
            keyExtractor={(t) => String(t.id)}
            columns={[
              { key: 'status', label: '', width: 30, render: (t) => (
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.isActive ? '#22c55e' : '#5a7080', boxShadow: t.isActive ? '0 0 6px #22c55e' : 'none' }} />
              )},
              { key: 'name', label: L('Name','שם'), render: (t) => (
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{t.name}</Typography>
                  <Badge label={t.isActive ? 'Active' : 'Inactive'} variant={t.isActive ? 'green' : 'grey'} sx={{ mt: '2px' }} />
                </Box>
              )},
              { key: 'email', label: L('Email','מייל') },
              { key: 'phone', label: L('Phone','טלפון') },
              { key: 'commission', label: L('Commission','עמלה'), render: (t) => (t.commission || 0) + '%' },
              { key: 'jobs', label: L('Jobs','עבודות'), render: (t) => (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{t.jobsCompleted}</Typography>
                  <Typography sx={{ fontSize: 9, color: '#5a7080' }}>{t.activeJobs} active</Typography>
                </Box>
              )},
              { key: 'revenue', label: L(L('Revenue','הכנסה'),'הכנסה'), render: (t) => (
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.totalRevenue > 0 ? '#22c55e' : '#5a7080' }}>
                  {formatCurrency(t.totalRevenue, currency)}
                </Typography>
              )},
              { key: 'actions', label: '', render: (t) => (
                <Box sx={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <Button size="small" sx={{ fontSize: 10, minWidth: 'auto', p: '2px 8px', bgcolor: c.blueDim, color: c.blue, border: '1px solid rgba(79,143,255,0.2)', borderRadius: '6px' }}
                    onClick={(e) => { e.stopPropagation(); setEditTech({ ...t }); setShowModal(true); }}>{L("Edit","ערוך")}</Button>
                  <Button size="small" sx={{ fontSize: 10, minWidth: 'auto', p: '2px 8px', bgcolor: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '6px' }}
                    onClick={(e) => { e.stopPropagation(); handleResetPassword(t); }}>🔑</Button>
                  <Button size="small" sx={{ fontSize: 10, minWidth: 'auto', p: '2px 8px', bgcolor: c.hotDim, color: c.hot, border: '1px solid rgba(255,77,109,0.2)', borderRadius: '6px' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(t); }}>✕</Button>
                </Box>
              ), width: 150 },
            ]}
            data={techs}
            onRowClick={(t) => { setEditTech({ ...t }); setShowModal(true); }}
          />
        </Box>
      )}

      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editTech.id ? 'עריכת טכנאי' : 'הוספת טכנאי'}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button variant="contained" size="small" onClick={handleSave}>{editTech.id ? 'עדכן' : 'הוסף טכנאי'}</Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box><Label text={L("Name *","שם *")} /><TextField fullWidth size="small" value={editTech.name || ''} onChange={(e) => setEditTech({ ...editTech, name: e.target.value })} placeholder={L('John Smith','שם הלקוח')} /></Box>
          <Box><Label text={L("Email *","מייל *")} /><TextField fullWidth size="small" value={editTech.email || ''} onChange={(e) => setEditTech({ ...editTech, email: e.target.value })} placeholder={L("john@company.com","john@company.com")} /></Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Phone","טלפון")} /><TextField fullWidth size="small" value={editTech.phone || ''} onChange={(e) => setEditTech({ ...editTech, phone: e.target.value })} placeholder={L('(555) 000-0000','050-0000000')} /></Box>
            <Box><Label text={L("ZIP","מיקוד")} /><TextField fullWidth size="small" value={editTech.zip || ''} onChange={(e) => setEditTech({ ...editTech, zip: e.target.value })} placeholder={L('10001','0000000')} /></Box>
          </Box>
          <Box><Label text={L("Commission %","עמלה %")} /><TextField fullWidth size="small" type="number" value={editTech.commission || 0} onChange={(e) => setEditTech({ ...editTech, commission: parseFloat(e.target.value) || 0 })} /></Box>
          {!editTech.id && (
            <Box sx={{ bgcolor: c.accentDim, border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', p: '11px 14px', fontSize: 12, color: c.text2, lineHeight: 1.7 }}>
              💡 The technician will use their email to log in. Default password: <strong>Tech1234!</strong><br />
              🔐 They will be required to set a new password on first login.
            </Box>
          )}
        </Box>
      </ModalBase>
    </Box>
  );
}
