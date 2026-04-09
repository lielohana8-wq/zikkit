'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, InputAdornment, Menu, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatJobNumber, formatCurrency } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job, JobStatus } from '@/types';

export default function TechJobsPage() {
  const { user } = useAuth();
  const L = useL();
  const { lang } = useLanguage();
  const { db, saveData, cfg } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeJob, setCloseJob] = useState<Job | null>(null);
  const [closeRevenue, setCloseRevenue] = useState(0);
  const [closeMaterials, setCloseMaterials] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');
  const currency = cfg.currency || 'USD';

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuJob, setMenuJob] = useState<Job | null>(null);

  const techName = user?.name || '';

  const myJobs = useMemo(() => {
    let filtered = (db.jobs || []).filter((j) => j.tech === techName);
    if (statusFilter !== 'all') filtered = filtered.filter((j) => j.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((j) =>
        j.client?.toLowerCase().includes(q) || j.desc?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q) || j.num?.includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [db.jobs, techName, search, statusFilter]);

  const handleStatusChange = async (job: Job, newStatus: JobStatus) => {
    const jobsList = [...(db.jobs || [])];
    const idx = jobsList.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobsList[idx] = { ...jobsList[idx], status: newStatus };
      await saveData({ ...db, jobs: jobsList });
      toast(L('סטטוס עודכן','סטטוס עודכן'));
    }
    handleCloseMenu();
  };

  const openCloseJob = (job: Job) => {
    setCloseJob(job);
    setCloseRevenue(job.revenue || 0);
    setCloseMaterials(job.materials || 0);
    setCloseNotes('');
    setShowCloseModal(true);
    handleCloseMenu();
  };

  const handleCloseJobSubmit = async () => {
    if (!closeJob) return;
    const jobsList = [...(db.jobs || [])];
    const idx = jobsList.findIndex((j) => j.id === closeJob.id);
    if (idx >= 0) {
      jobsList[idx] = {
        ...jobsList[idx], status: 'completed', revenue: closeRevenue, materials: closeMaterials,
        notes: (jobsList[idx].notes || '') + (closeNotes ? '\n--- Closed by Tech ---\n' + closeNotes : ''),
      };
      await saveData({ ...db, jobs: jobsList });
      toast('✅ Job closed!');
    }
    setShowCloseModal(false);
    setCloseJob(null);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, job: Job) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuJob(job);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuJob(null);
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#5a7080', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title={L("My Jobs","העבודות שלי")} subtitle={myJobs.length + L(" assigned to you"," משויכות אליך")} />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: '10px', mb: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField placeholder="חיפוש עבודות..." value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#5a7080' }} /></InputAdornment> }} />
        {['all', 'assigned', 'in_progress', 'scheduled', 'waiting_parts', 'parts_arrived', 'no_answer', 'callback', 'completed'].map((s) => {
          const cfg = JOB_STATUS_CONFIG[s as keyof typeof JOB_STATUS_CONFIG];
          return (
            <Button key={s} size="small" onClick={() => setStatusFilter(s)} sx={{
              px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
              bgcolor: statusFilter === s ? 'rgba(0,229,176,0.08)' : 'rgba(255,255,255,0.05)',
              color: statusFilter === s ? '#00e5b0' : '#5a7080',
              border: '1px solid ' + (statusFilter === s ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.09)'),
            }}>
              {s === 'all' ? 'הכל' : cfg?.label || s}
            </Button>
          );
        })}
      </Box>

      {myJobs.length === 0 ? (
        <EmptyState icon="🔧" title={L("No Jobs Assigned","אין עבודות משויכות")} subtitle={L("Jobs will appear here.","עבודות שישויכו אליך יופיעו כאן.")} />
      ) : (
        <Box sx={{ bgcolor: '#0f1318', border: '1px solid rgba(255,255,255,0.055)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<Job>
            keyExtractor={(j) => j.id}
            columns={[
              { key: 'num', label: '#', render: (j) => <Typography sx={{ fontWeight: 700, fontSize: 11 }}>{j.num || formatJobNumber(j.id)}</Typography>, width: 70 },
              { key: 'client', label: 'לקוח' },
              { key: 'phone', label: 'טלפון', render: (j) => j.phone || '—' },
              { key: 'address', label: 'כתובת', render: (j) => j.address || '—' },
              { key: 'status', label: 'סטטוס', render: (j) => {
                const cfg = JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG];
                return <Badge label={cfg?.label || j.status} variant={cfg?.color || 'grey'} />;
              }},
              { key: 'revenue', label: L('Revenue','הכנסה'), render: (j) => j.revenue ? formatCurrency(j.revenue, currency) : '—' },
              { key: 'created', label: 'תאריך', render: (j) => formatDate(j.created) },
              { key: 'actions', label: '', width: 80, render: (j) => (
                <Button size="small" onClick={(e) => handleOpenMenu(e, j)}
                  sx={{ fontSize: 11, minWidth: 'auto', p: '3px 10px', bgcolor: 'rgba(255,255,255,0.05)', color: '#a8bcc8', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '6px' }}>
                  ⋮ פעולות
                </Button>
              )},
            ]}
            data={myJobs}
          />
        </Box>
      )}

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}
        PaperProps={{ sx: { bgcolor: '#0f1318', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', minWidth: 200 } }}>
        {menuJob && menuJob.status !== 'in_progress' && menuJob.status !== 'completed' && (
          <MenuItem onClick={() => { if (menuJob) handleStatusChange(menuJob, 'in_progress'); }}
            sx={{ fontSize: 12, gap: '8px', color: '#f59e0b', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
            ▶️ התחל עבודה
          </MenuItem>
        )}
        {menuJob && menuJob.status !== 'completed' && (
          <MenuItem onClick={() => { if (menuJob) openCloseJob(menuJob); }}
            sx={{ fontSize: 12, gap: '8px', color: '#22c55e', fontWeight: 700, '&:hover': { bgcolor: 'rgba(34,197,94,0.08)' } }}>
            ✅ סגור עבודה
          </MenuItem>
        )}
        {menuJob && menuJob.status === 'in_progress' && (
          <MenuItem onClick={() => { if (menuJob) handleStatusChange(menuJob, 'waiting_parts'); }}
            sx={{ fontSize: 12, gap: '8px', color: '#a78bfa', '&:hover': { bgcolor: 'rgba(167,139,250,0.08)' } }}>
            📦 ממתין לחלקים
          </MenuItem>
        )}
        {menuJob && menuJob.status === 'waiting_parts' && (
          <MenuItem onClick={() => { if (menuJob) handleStatusChange(menuJob, 'parts_arrived'); }}
            sx={{ fontSize: 12, gap: '8px', color: '#22c55e', '&:hover': { bgcolor: 'rgba(34,197,94,0.08)' } }}>
            📦 חלקים הגיעו
          </MenuItem>
        )}
        <MenuItem onClick={() => { if (menuJob) handleStatusChange(menuJob, 'callback'); }}
          sx={{ fontSize: 12, gap: '8px', color: '#a8bcc8', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
          📞 חזרה ללקוח
        </MenuItem>
        <MenuItem onClick={() => { if (menuJob) handleStatusChange(menuJob, 'no_answer'); }}
          sx={{ fontSize: 12, gap: '8px', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}>
          📵 לקוח לא עונה
        </MenuItem>
      </Menu>

      {/* סגור עבודה Modal */}
      <ModalBase open={showCloseModal} onClose={() => setShowCloseModal(false)} title={'סגור עבודה ' + (closeJob?.num || '')}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowCloseModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button size="small" onClick={handleCloseJobSubmit}
            sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#22c55e', color: '#000' } }}>
            ✅ סגור והשלם
          </Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box sx={{ bgcolor: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', p: '12px 16px', fontSize: 12, color: '#a8bcc8', lineHeight: 1.7 }}>
            📋 Client: <strong>{closeJob?.client}</strong><br />
            📍 Address: {closeJob?.address || '—'}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Total Revenue ($)","סכום הכנסה")} /><TextField fullWidth size="small" type="number" value={closeRevenue} onChange={(e) => setCloseRevenue(parseFloat(e.target.value) || 0)} /></Box>
            <Box><Label text={L("Materials Cost ($)","עלות חומרים")} /><TextField fullWidth size="small" type="number" value={closeMaterials} onChange={(e) => setCloseMaterials(parseFloat(e.target.value) || 0)} /></Box>
          </Box>
          {closeRevenue > 0 && (
            <Box sx={{ bgcolor: '#141920', border: '1px solid rgba(255,255,255,0.055)', borderRadius: '10px', p: '12px 16px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 12, color: '#5a7080' }}>{L('Revenue','הכנסה')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(closeRevenue, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 12, color: '#5a7080' }}>{L('Materials','חומרים')}</Typography>
                <Typography sx={{ fontSize: 12, color: '#ff4d6d' }}>-{formatCurrency(closeMaterials, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '8px', borderTop: '1px solid rgba(255,255,255,0.055)' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{L('Profit','רווח')}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#00e5b0' }}>{formatCurrency(closeRevenue - closeMaterials, currency)}</Typography>
              </Box>
            </Box>
          )}
          <Box><Label text={L("Closing Notes","הערות סגירה")} /><TextField fullWidth size="small" multiline rows={2} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="עבודה הושלמה..." /></Box>
        </Box>
      </ModalBase>
    </Box>
  );
}
