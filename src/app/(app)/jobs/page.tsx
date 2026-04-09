'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';
import { useState, useMemo, useRef } from 'react';
import { Box, Button, TextField, Typography, InputAdornment, Menu, MenuItem, Select, Checkbox } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { usePortal } from '@/hooks/usePortal';
import { formatDate, formatJobNumber, formatCurrency } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import { zikkitColors as c } from '@/styles/theme';
import type { Job, JobStatus } from '@/types';
import { generateInvoiceHTML, printInvoice } from '@/lib/invoice';
import { DEFAULT_TEMPLATES } from '@/lib/job-templates';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: 'דחוף', he: 'דחוף', color: '#ff4d6d', dot: '🔴' },
  high: { label: 'גבוה', he: 'גבוה', color: '#f59e0b', dot: '🟠' },
  normal: { label: 'רגיל', he: 'רגיל', color: '#4f8fff', dot: '🔵' },
  low: { label: 'נמוך', he: 'נמוך', color: '#78716C', dot: '⚪' },
};

export default function JobsPage() {
  const { db, saveData, cfg } = useData();
  const L = useL();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { sendJobPortal, resendPortalLink, sendJobPortalSms } = usePortal();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [editJob, setEditJob] = useState<Partial<Job>>({});
  const [closeRevenue, setCloseRevenue] = useState(0);
  const [closeMaterials, setCloseMaterials] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [closePayment, setClosePayment] = useState('cash');

  // ── Separate ref for close-job data — fixes the null bug ──
  const closeJobRef = useRef<Job | null>(null);

  // Actions menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuJob, setMenuJob] = useState<Job | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);

  const taxRate = cfg.tax_rate || 0;
  const currency = cfg.currency || (cfg.region === 'IL' || cfg.lang === 'he' ? 'ILS' : 'USD');

  const techs = useMemo(() => (db.users || []).filter((u) => u.role === 'tech' || u.role === 'technician'), [db.users]);

  // ── Status counts ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: (db.jobs || []).length };
    (db.jobs || []).forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return counts;
  }, [db.jobs]);

  const jobs = useMemo(() => {
    let filtered = [...(db.jobs || [])];
    if (statusFilter !== 'all') filtered = filtered.filter((j) => j.status === statusFilter);
    if (techFilter !== 'all') filtered = filtered.filter((j) => j.tech === techFilter);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((j) =>
        j.client?.toLowerCase().includes(q) || j.desc?.toLowerCase().includes(q) ||
        j.phone?.includes(q) || j.address?.toLowerCase().includes(q) || j.num?.includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [db.jobs, search, statusFilter, techFilter]);

  const openNew = () => {
    setEditJob({
      client: '', phone: '', address: '', zip: '', desc: '', status: 'open',
      priority: 'normal', date: new Date().toISOString().slice(0, 10),
      scheduledDate: '', scheduledTime: '', time: '',
    });
    setShowModal(true);
  };

  const openEdit = (job: Job) => {
    setEditJob({ ...job });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editJob.client?.trim()) { toast('Please enter a client name', '#ff4d6d'); return; }
    const jobsList = [...(db.jobs || [])];
    if (editJob.id) {
      const idx = jobsList.findIndex((j) => j.id === editJob.id);
      if (idx >= 0) jobsList[idx] = editJob as Job;
    } else {
      const maxId = jobsList.reduce((m, j) => Math.max(m, j.id || 0), 0);
      const newJob: Job = {
        ...editJob, id: maxId + 1, num: formatJobNumber(maxId + 1),
        status: (editJob.status as JobStatus) || 'open', created: new Date().toISOString(),
      } as Job;
      jobsList.push(newJob);
    }
    await saveData({ ...db, jobs: jobsList });
    setShowModal(false);
    toast(editJob.id ? '✅ Job updated!' : '✅ Job created!');
  };

  const handleDelete = async (job: Job) => {
    if (!confirm(L('Delete job ','מחק עבודה ') + (job.num || '#' + job.id) + '?')) return;
    await saveData({ ...db, jobs: (db.jobs || []).filter((j) => j.id !== job.id) });
    toast(L('עבודה נמחקה','עבודה נמחקה'));
    handleCloseMenu();
  };

  const handleDuplicate = async (job: Job) => {
    const newJob = {
      ...job,
      id: 'job_' + Date.now(),
      num: formatJobNumber((db.jobs || []).length + 1),
      status: 'draft' as const,
      created: new Date().toISOString(),
      portalToken: undefined,
    };
    await saveData({ ...db, jobs: [...(db.jobs || []), newJob] });
    toast(L('Job duplicated','עבודה שוכפלה'));
    handleCloseMenu();
  };

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

  const handleAssignTech = async (job: Job, techName: string) => {
    const jobsList = [...(db.jobs || [])];
    const idx = jobsList.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobsList[idx] = { ...jobsList[idx], tech: techName, status: job.status === 'open' ? 'assigned' : job.status };
      await saveData({ ...db, jobs: jobsList });
      toast('✅ Assigned to ' + techName);
    }
    handleCloseMenu();
  };

  // ── סגור עבודה — uses ref so it persists after menu closes ──
  const openCloseJob = (job: Job) => {
    closeJobRef.current = job;
    setCloseRevenue(job.revenue || 0);
    setCloseMaterials(job.materials || 0);
    setCloseNotes('');
    setClosePayment('cash');
    setShowCloseModal(true);
    // Close menu without clearing ref
    setMenuAnchor(null);
    setMenuJob(null);
  };

  const handleCloseJob = async () => {
    const job = closeJobRef.current;
    if (!job) return;

    const tax = (closeRevenue * taxRate) / 100;
    const tech = techs.find((t) => t.name === job.tech);
    const commissionRate = tech?.commission || 0;
    const commissionAmount = (closeRevenue * commissionRate) / 100;

    const jobsList = [...(db.jobs || [])];
    const idx = jobsList.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      const updatedJob = {
        ...jobsList[idx],
        status: 'completed' as const,
        revenue: closeRevenue,
        materials: closeMaterials,
        cost: closeMaterials + tax + commissionAmount,
        paymentMethod: closePayment,
        notes: (jobsList[idx].notes || '') + (closeNotes ? '\n--- Closed ---\n' + closeNotes : ''),
      };
      jobsList[idx] = updatedJob;
      await saveData({ ...db, jobs: jobsList });

      // Auto-update portal snapshot if exists
      // Auto-update portal if exists
      if (updatedJob.portalToken) {
        try {
          const { getFirestoreDb, doc: fbDoc, setDoc: fbSet } = await import('@/lib/firebase');
          const firestore = getFirestoreDb();
          await fbSet(fbDoc(firestore, 'public_portals', updatedJob.portalToken), {
            type: 'job',
            bizName: cfg.biz_name || 'Business',
            bizPhone: cfg.biz_phone || '',
            bizEmail: cfg.biz_email || '',
            bizAddress: cfg.biz_address || '',
            bizColor: cfg.biz_color || '#4F46E5',
            currency: cfg.currency || 'USD',
            taxRate: cfg.tax_rate || 0,
            quoteFooter: cfg.quote_footer || '',
            receiptFooter: cfg.receipt_footer || '',
            job: updatedJob,
            updated: new Date().toISOString(),
          });
        } catch (portalErr) {
          console.warn('[Jobs] Portal update failed:', portalErr);
        }
      }

      toast('✅ ' + L('Job closed!','עבודה נסגרה!'));
    }
    setShowCloseModal(false);
    closeJobRef.current = null;
  };

  const handleStartJob = async (job: Job) => {
    await handleStatusChange(job, 'in_progress');
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

  // ── Bulk actions ──
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const handleBulkStatus = async (newStatus: JobStatus) => {
    if (selectedIds.size === 0) return;
    const jobsList = [...(db.jobs || [])];
    selectedIds.forEach((id) => {
      const idx = jobsList.findIndex((j) => j.id === id);
      if (idx >= 0) jobsList[idx] = { ...jobsList[idx], status: newStatus };
    });
    await saveData({ ...db, jobs: jobsList });
    toast(`✅ ${selectedIds.size} ${L('jobs updated','עבודות עודכנו')}`);
    setSelectedIds(new Set());
    setBulkMenuAnchor(null);
  };

  const handleBulkAssign = async (techName: string) => {
    if (selectedIds.size === 0) return;
    const jobsList = [...(db.jobs || [])];
    selectedIds.forEach((id) => {
      const idx = jobsList.findIndex((j) => j.id === id);
      if (idx >= 0) jobsList[idx] = { ...jobsList[idx], tech: techName, status: jobsList[idx].status === 'open' ? 'assigned' : jobsList[idx].status };
    });
    await saveData({ ...db, jobs: jobsList });
    toast(`✅ ${selectedIds.size} ${L('jobs assigned to','עבודות שויכו ל')} ${techName}`);
    setSelectedIds(new Set());
    setBulkMenuAnchor(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} jobs?`)) return;
    await saveData({ ...db, jobs: (db.jobs || []).filter((j) => !selectedIds.has(j.id)) });
    toast(`🗑️ ${selectedIds.size} jobs deleted`);
    setSelectedIds(new Set());
    setBulkMenuAnchor(null);
  };

  // ── Close modal computed values ──
  const closeJob = closeJobRef.current;
  const closeTax = (closeRevenue * taxRate) / 100;
  const closeTech = closeJob ? techs.find((t) => t.name === closeJob.tech) : null;
  const closeCommRate = closeTech?.commission || 0;
  const closeCommission = (closeRevenue * closeCommRate) / 100;
  const closeProfit = closeRevenue - closeMaterials - closeTax - closeCommission;

  const statusOptions = ['all', ...Object.keys(JOB_STATUS_CONFIG)];

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  const handleInvoice = (job: Job) => {
    const html = generateInvoiceHTML({
      bizName: cfg.biz_name || 'Business',
      bizPhone: cfg.biz_phone || '',
      bizAddress: cfg.biz_address || '',
      client: job.client || '',
      phone: job.phone || '',
      email: job.email || '',
      address: job.address || '',
      invoiceNum: job.num || String(job.id),
      date: new Date().toLocaleDateString('he-IL'),
      items: [{ desc: job.desc || 'שירות', qty: 1, price: job.revenue || 0 }],
      taxRate: cfg.tax_rate || 17,
      currency: cfg.currency || 'ILS',
    });
    printInvoice(html);
  };

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title={L('Jobs','עבודות')} subtitle={jobs.length + L(' עבודות',' עבודות')} actions={
        <Button variant="contained" size="small" onClick={openNew}>{L('+ עבודה חדשה','+ עבודה חדשה')}</Button>
      } />

      {/* ── Job KPIs ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 1, mb: 2 }}>
        {[
          { label: 'פתוחות', count: (db.jobs || []).filter((j: any) => j.status === 'open').length, color: '#FFB020' },
          { label: 'שויכו', count: (db.jobs || []).filter((j: any) => j.status === 'assigned').length, color: '#3B82F6' },
          { label: 'בטיפול', count: (db.jobs || []).filter((j: any) => j.status === 'in_progress').length, color: '#F97316' },
          { label: 'מתוכננות', count: (db.jobs || []).filter((j: any) => j.status === 'scheduled').length, color: '#8B5CF6' },
          { label: 'הושלמו', count: (db.jobs || []).filter((j: any) => j.status === 'completed').length, color: '#10B981' },
          { label: 'בוטלו', count: (db.jobs || []).filter((j: any) => j.status === 'cancelled').length, color: '#EF4444' },
        ].map((s, i) => (
          <Box key={i} onClick={() => setStatusFilter(s.label === 'פתוחות' ? 'open' : s.label === 'שויכו' ? 'assigned' : s.label === 'בטיפול' ? 'in_progress' : s.label === 'מתוכננות' ? 'scheduled' : s.label === 'הושלמו' ? 'completed' : 'cancelled')} sx={{ p: 1.5, borderRadius: 2, bgcolor: `${s.color}08`, border: `1px solid ${s.color}20`, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-1px)', bgcolor: `${s.color}14` } }}>
            <Typography sx={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.count}</Typography>
            <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* ── Filters ── */}
      <Box sx={{ display: 'flex', gap: '10px', mb: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField placeholder={L("חיפוש עבודות...","חפש עבודות...")} value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#78716C' }} /></InputAdornment> }} />
        {/* Tech filter */}
        <Select value={techFilter} onChange={(e) => setTechFilter(e.target.value)} size="small" displayEmpty
          sx={{ minWidth: 140, bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 11, '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' } }}>
          <MenuItem value="all" sx={{ fontSize: 12 }}>{L('👷 כל הטכנאים','👷 כל הטכנאים')}</MenuItem>
          <MenuItem value="" sx={{ fontSize: 12 }}>— לא שובץ</MenuItem>
          {techs.map((t) => <MenuItem key={String(t.id)} value={t.name} sx={{ fontSize: 12 }}>👷 {t.name}</MenuItem>)}
        </Select>
      </Box>

      {/* Status filter buttons with counts */}
      <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap', mb: '12px' }}>
        {statusOptions.map((s) => {
          const cfgItem = JOB_STATUS_CONFIG[s as keyof typeof JOB_STATUS_CONFIG];
          const count = statusCounts[s] || 0;
          return (
            <Button key={s} size="small" onClick={() => setStatusFilter(s)} sx={{
              px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
              bgcolor: statusFilter === s ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
              color: statusFilter === s ? '#4F46E5' : '#78716C',
              border: '1px solid ' + (statusFilter === s ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
            }}>
              {s === 'all' ? L('All','הכל') + ` (${count})` : `${(lang==='he'?cfgItem?.he:cfgItem?.label) || s} (${count})`}
            </Button>
          );
        })}
      </Box>

      {/* ── Bulk actions bar ── */}
      {selectedIds.size > 0 && (
        <Box sx={{
          display: 'flex', gap: '8px', alignItems: 'center', mb: '12px', p: '10px 14px',
          bgcolor: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px',
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#4F46E5' }}>
            {selectedIds.size} selected
          </Typography>
          <Button size="small" onClick={(e) => setBulkMenuAnchor(e.currentTarget)} sx={{
            fontSize: 10, px: '10px', py: '3px', bgcolor: 'rgba(0,0,0,0.03)', color: '#A8A29E',
            border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px',
          }}>
            {L('⚡ Bulk Actions','⚡ פעולות מרובות')}
          </Button>
          <Button size="small" onClick={() => setSelectedIds(new Set())} sx={{
            fontSize: 10, px: '8px', py: '3px', color: '#78716C', minWidth: 'auto',
          }}>
            ✕ Clear
          </Button>
        </Box>
      )}

      {/* Bulk Actions Menu */}
      <Menu anchorEl={bulkMenuAnchor} open={Boolean(bulkMenuAnchor)} onClose={() => setBulkMenuAnchor(null)}
        PaperProps={{ sx: { bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', minWidth: 220 } }}>
        <Box sx={{ px: '16px', py: '6px', fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          שנה סטטוס
        </Box>
        {['open', 'assigned', 'in_progress', 'scheduled', 'completed', 'cancelled'].map((s) => (
          <MenuItem key={s} onClick={() => handleBulkStatus(s as JobStatus)}
            sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', pl: '24px', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
            {(lang==='he'?JOB_STATUS_CONFIG[s as keyof typeof JOB_STATUS_CONFIG]?.he:JOB_STATUS_CONFIG[s as keyof typeof JOB_STATUS_CONFIG]?.label) || s}
          </MenuItem>
        ))}
        {techs.length > 0 && (
          <>
            <Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', my: '4px' }} />
            <Box sx={{ px: '16px', py: '6px', fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Assign Tech
            </Box>
            {techs.map((t) => (
              <MenuItem key={String(t.id)} onClick={() => handleBulkAssign(t.name)}
                sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', pl: '24px', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
                👷 {t.name}
              </MenuItem>
            ))}
          </>
        )}
        <Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', my: '4px' }} />
        <MenuItem onClick={handleBulkDelete}
          sx={{ fontSize: 12, gap: '8px', color: '#ff4d6d', '&:hover': { bgcolor: 'rgba(255,77,109,0.1)' } }}>
          🗑️ Delete Selected
        </MenuItem>
      </Menu>

      {/* ── Table ── */}
      {jobs.length === 0 ? (
        <EmptyState icon="🔧" title={L("אין עבודות","אין עבודות עדיין")} subtitle={L("Create your first job to get started.","צור את העבודה הראשונה שלך.")} actionLabel={L("+ עבודה חדשה","+ עבודה חדשה")} onAction={openNew} />
      ) : (
        <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<Job>
            keyExtractor={(j) => j.id}
            columns={[
              { key: 'select', label: '', width: 40, render: (j) => (
                <Checkbox size="small" checked={selectedIds.has(j.id)}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(j.id); }}
                  sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 }, color: '#78716C', '&.Mui-checked': { color: '#4F46E5' } }} />
              )},
              { key: 'priority', label: '', width: 30, render: (j) => {
                const p = PRIORITY_CONFIG[j.priority || 'normal'];
                return <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p?.color || '#4f8fff', boxShadow: `0 0 6px ${p?.color || '#4f8fff'}` }} />;
              }},
              { key: 'num', label: '#', render: (j) => <Typography sx={{ fontWeight: 700, fontSize: 11 }}>{j.num || formatJobNumber(j.id)}</Typography>, width: 70 },
              { key: 'client', label: L('Client','לקוח') },
              { key: 'phone', label: L('Phone','טלפון') },
              { key: 'status', label: L('Status','סטטוס'), render: (j) => {
                const cfgItem = JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG];
                return <Badge label={(lang==='he'?cfgItem?.he:cfgItem?.label) || j.status} variant={cfgItem?.color || 'grey'} />;
              }},
              { key: 'tech', label: L('Tech','טכנאי'), render: (j) => j.tech || '—' },
              { key: 'revenue', label: L('Revenue','הכנסה'), render: (j) => j.revenue ? formatCurrency(j.revenue, currency) : '—' },
              { key: 'created', label: L('Created','נוצר'), render: (j) => formatDate(j.created) },
              { key: 'actions', label: '', width: 80, render: (j) => (
                <Button size="small" onClick={(e) => handleOpenMenu(e, j)}
                  sx={{ fontSize: 11, minWidth: 'auto', p: '3px 10px', bgcolor: 'rgba(0,0,0,0.03)', color: '#A8A29E', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px' }}>
                  {L('⋮ פעולות','⋮ פעולות')}
                </Button>
              )},
            ]}
            data={jobs}
            onRowClick={openEdit}
          />
        </Box>
      )}

      {/* ══ Actions Menu ══ */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}
        PaperProps={{ sx: { bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', minWidth: 220 } }}>

        <MenuItem onClick={() => { if (menuJob) openEdit(menuJob); handleCloseMenu(); }}
          sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
          {L('✏️ עריכת עבודה','✏️ ערוך עבודה')}
        </MenuItem>

        <MenuItem onClick={() => { if (menuJob) handleDuplicate(menuJob); }}
          sx={{ fontSize: 12, gap: '8px', color: '#06b6d4', '&:hover': { bgcolor: 'rgba(6,182,212,0.08)' } }}>
          {L('📋 Duplicate Job','📋 שכפל עבודה')}
        </MenuItem>

        {menuJob && menuJob.status !== 'in_progress' && menuJob.status !== 'completed' && (
          <MenuItem onClick={() => { if (menuJob) handleStartJob(menuJob); }}
            sx={{ fontSize: 12, gap: '8px', color: '#f59e0b', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
            {L('▶️ Start Job','▶️ התחל עבודה')}
          </MenuItem>
        )}

        {menuJob && menuJob.status !== 'completed' && (
          <MenuItem onClick={() => { if (menuJob) openCloseJob(menuJob); }}
            sx={{ fontSize: 12, gap: '8px', color: '#22c55e', fontWeight: 700, '&:hover': { bgcolor: 'rgba(34,197,94,0.08)' } }}>
            {L('✅ סגור עבודה','✅ סגור עבודה')}
          </MenuItem>
        )}

        {/* Assign Tech submenu */}
        {techs.length > 0 && (
          <Box>
            <Box sx={{ px: '16px', py: '6px', fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Assign Technician
            </Box>
            {techs.map((t) => (
              <MenuItem key={String(t.id)} onClick={() => { if (menuJob) handleAssignTech(menuJob, t.name); }}
                sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', pl: '24px', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
                👷 {t.name}
              </MenuItem>
            ))}
          </Box>
        )}

        <Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', my: '4px' }} />

        <Box sx={{ px: '16px', py: '6px', fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {L('שנה סטטוס','שנה סטטוס')}
        </Box>
        {[
          { status: 'open' as JobStatus, icon: '📋', label: 'Open', he: 'פתוח' },
          { status: 'assigned' as JobStatus, icon: '👷', label: 'Assigned', he: 'שויך' },
          { status: 'in_progress' as JobStatus, icon: '🔧', label: 'In Progress', he: 'בטיפול' },
          { status: 'waiting_parts' as JobStatus, icon: '📦', label: 'Waiting Parts', he: 'ממתין לחלקים' },
          { status: 'parts_arrived' as JobStatus, icon: '✅', label: 'Parts Arrived', he: 'חלקים הגיעו' },
          { status: 'scheduled' as JobStatus, icon: '📅', label: 'Scheduled', he: 'מתוכנן' },
          { status: 'no_answer' as JobStatus, icon: '📵', label: 'No Answer', he: 'אין מענה' },
          { status: 'callback' as JobStatus, icon: '📞', label: 'Callback', he: 'חזרה' },
          { status: 'cancelled' as JobStatus, icon: '🚫', label: 'Cancelled', he: 'בוטל' },
        ].map((item) => (
          <MenuItem key={item.status} onClick={() => { if (menuJob) handleStatusChange(menuJob, item.status); }}
            sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', pl: '24px', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
            {item.icon} {lang === 'he' ? item.he : item.label}
          </MenuItem>
        ))}

        <Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', my: '4px' }} />

        {/* Send Portal — for completed jobs */}
        {menuJob && menuJob.status === 'completed' && (
          <MenuItem onClick={async () => {
            if (!menuJob) return;
            // Get FRESH job data from db (menuJob may be stale)
            const freshJob = (db.jobs || []).find((j) => j.id === menuJob.id) || menuJob;
            const email = freshJob.email
              || (db.leads || []).find((l) => l.phone === freshJob.phone)?.email
              || (db.quotes || []).find((q) => q.phone === freshJob.phone)?.email
              || '';
            if (!email) {
              toast(L('No email found. Add email to the job first.','לא נמצא מייל. הוסף מייל לעבודה.'), '#ff4d6d');
              handleCloseMenu();
              return;
            }
            await sendJobPortal(freshJob, email);
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#a78bfa', fontWeight: 700, '&:hover': { bgcolor: 'rgba(167,139,250,0.08)' } }}>
            {L('📧 Send Receipt to Client','📧 שלח קבלה ללקוח')}
          </MenuItem>
        )}

        {/* Send Portal link — for any non-cancelled job */}
        {menuJob && menuJob.status !== 'cancelled' && menuJob.status !== 'completed' && (
          <MenuItem onClick={async () => {
            if (!menuJob) return;
            const email = menuJob.email
              || (db.leads || []).find((l) => l.phone === menuJob.phone)?.email || '';
            if (!email) {
              toast(L('No email found.','לא נמצא מייל.'), '#ff4d6d');
              handleCloseMenu();
              return;
            }
            await sendJobPortal(menuJob, email);
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#4f8fff', '&:hover': { bgcolor: 'rgba(79,143,255,0.08)' } }}>
            {L('🔗 Send Client Portal','🔗 שלח פורטל ללקוח')}
          </MenuItem>
        )}

        {/* Resend Portal Link */}
        {menuJob && menuJob.portalToken && (
          <MenuItem onClick={async () => {
            if (!menuJob) return;
            const email = menuJob.email
              || (db.leads || []).find((l) => l.phone === menuJob.phone)?.email || '';
            if (!email) {
              toast(L('No email found.','לא נמצא מייל.'), '#ff4d6d');
              handleCloseMenu();
              return;
            }
            await resendPortalLink('job', menuJob, email);
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#06b6d4', '&:hover': { bgcolor: 'rgba(6,182,212,0.08)' } }}>
            {L('🔄 Resend Portal Link','🔄 שלח לינק שוב')}
          </MenuItem>
        )}

        {/* Send via SMS */}
        {menuJob && menuJob.phone && menuJob.status !== 'cancelled' && (
          <MenuItem onClick={async () => {
            if (!menuJob) return;
            await sendJobPortalSms(menuJob, menuJob.phone);
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#22c55e', fontWeight: 700, '&:hover': { bgcolor: 'rgba(34,197,94,0.08)' } }}>
            {menuJob.status === 'completed' ? L('📱 Send Receipt via SMS','📱 שלח קבלה ב-SMS') : L('📱 Send Portal via SMS','📱 שלח פורטל ב-SMS')}
          </MenuItem>
        )}

        {menuJob && menuJob.phone && menuJob.status !== 'cancelled' && (
          <MenuItem onClick={() => {
            if (!menuJob) return;
            const url = menuJob.portalToken ? `${window.location.origin}/portal/${menuJob.portalToken}` : '';
            const isReceipt = menuJob.status === 'completed';
            const msg = isReceipt
              ? `היי ${menuJob.client || ''}, הנה הקבלה שלך מ-${cfg.biz_name || 'העסק'}${url ? ': ' + url : ''}`
              : `היי ${menuJob.client || ''}, הנה פרטי העבודה שלך מ-${cfg.biz_name || 'העסק'}${url ? ': ' + url : ''}`;
            const phone = menuJob.phone.replace(/[^0-9]/g, '');
            const waPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
            window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#25D366', fontWeight: 700, '&:hover': { bgcolor: 'rgba(37,211,102,0.08)' } }}>
            {menuJob.status === 'completed' ? L('💬 Receipt via WhatsApp','💬 קבלה בוואטסאפ') : L('💬 Portal via WhatsApp','💬 פורטל בוואטסאפ')}
          </MenuItem>
        )}

        <MenuItem onClick={() => { if (menuJob) handleDelete(menuJob); }}
          sx={{ fontSize: 12, gap: '8px', color: '#ff4d6d', '&:hover': { bgcolor: 'rgba(255,77,109,0.1)' } }}>
          {L('🗑️ מחק עבודה','🗑️ מחק עבודה')}
        </MenuItem>
      </Menu>

      {/* ══ Edit/Create Modal ══ */}
      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editJob.id ? L('עריכת עבודה ','ערוך עבודה ') + (editJob.num || '') : L('עבודה חדשה','עבודה חדשה')}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button variant="contained" size="small" onClick={handleSave}>{editJob.id ? L('עדכן','עדכן') : L('Create Job','צור עבודה')}</Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box><Label text={L("Client Name *","שם לקוח *")} /><TextField fullWidth size="small" value={editJob.client || ''} onChange={(e) => setEditJob({ ...editJob, client: e.target.value })} placeholder={L('John Smith','שם הלקוח')} /></Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Phone","טלפון")} /><TextField fullWidth size="small" value={editJob.phone || ''} onChange={(e) => setEditJob({ ...editJob, phone: e.target.value })} placeholder={L('(555) 000-0000','050-0000000')} /></Box>
            <Box><Label text={L("Email","מייל")} /><TextField fullWidth size="small" type="email" value={editJob.email || ''} onChange={(e) => setEditJob({ ...editJob, email: e.target.value })} placeholder={L('client@email.com','email@example.com')} /></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Address","כתובת")} /><TextField fullWidth size="small" value={editJob.address || ''} onChange={(e) => setEditJob({ ...editJob, address: e.target.value })} placeholder={L('123 Main St','רחוב הדוגמא 123')} /></Box>
            <Box><Label text={L("ZIP","מיקוד")} /><TextField fullWidth size="small" value={editJob.zip || ''} onChange={(e) => setEditJob({ ...editJob, zip: e.target.value })} placeholder={L('10001','0000000')} /></Box>
          </Box>
          <Box><Label text={L("Description","תיאור")} /><TextField fullWidth size="small" multiline rows={3} value={editJob.desc || ''} onChange={(e) => setEditJob({ ...editJob, desc: e.target.value })} placeholder={L('Describe the job...','תאר את העבודה...')} /></Box>

          {/* Priority + Scheduled — always show (new + edit) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Priority","עדיפות")} />
              <Box sx={{ display: 'flex', gap: '6px' }}>
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                  <Button key={p} size="small" onClick={() => setEditJob({ ...editJob, priority: p })} sx={{
                    px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize', flex: 1,
                    bgcolor: editJob.priority === p ? `${PRIORITY_CONFIG[p].color}18` : 'rgba(0,0,0,0.03)',
                    color: editJob.priority === p ? PRIORITY_CONFIG[p].color : '#78716C',
                    border: `1px solid ${editJob.priority === p ? PRIORITY_CONFIG[p].color + '44' : 'rgba(0,0,0,0.08)'}`,
                  }}>
                    {PRIORITY_CONFIG[p].dot} {lang === 'he' ? PRIORITY_CONFIG[p].he : p}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box><Label text={L("Assign Technician","שיך טכנאי")} />
              <Select fullWidth size="small" value={editJob.tech || ''} displayEmpty onChange={(e) => setEditJob({ ...editJob, tech: e.target.value })}
                sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13, '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' } }}>
                <MenuItem value="">{L('Unassigned','לא שויך')}</MenuItem>
                {techs.map((t) => <MenuItem key={String(t.id)} value={t.name}>{t.name}</MenuItem>)}
              </Select>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Scheduled Date","תאריך מתוכנן")} /><TextField fullWidth size="small" type="date" value={editJob.scheduledDate || ''} onChange={(e) => setEditJob({ ...editJob, scheduledDate: e.target.value })} /></Box>
            <Box><Label text={L("Scheduled Time","שעה מתוכננת")} /><TextField fullWidth size="small" type="time" value={editJob.scheduledTime || editJob.time || ''} onChange={(e) => setEditJob({ ...editJob, scheduledTime: e.target.value, time: e.target.value })} /></Box>
            <Box><Label text={L("Duration","משך זמן")} /><Select fullWidth size="small" value={(editJob as any).duration || 60} onChange={(e: any) => setEditJob({ ...editJob, duration: Number(e.target.value) } as any)} sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 }}>
              <MenuItem value={30}>30 {L("min","דק׳")}</MenuItem><MenuItem value={60}>1 {L("hr","שעה")}</MenuItem><MenuItem value={90}>1.5 {L("hrs","שעות")}</MenuItem><MenuItem value={120}>2 {L("hrs","שעות")}</MenuItem><MenuItem value={180}>3 {L("hrs","שעות")}</MenuItem><MenuItem value={240}>4 {L("hrs","שעות")}</MenuItem><MenuItem value={360}>6 {L("hrs","שעות")}</MenuItem><MenuItem value={480}>8 {L("hrs","שעות")}</MenuItem>
            </Select></Box>
          </Box>

          {editJob.id && (
            <>
              <Box><Label text={L("Status","סטטוס")} />
                <Select fullWidth size="small" value={editJob.status || 'open'} onChange={(e) => setEditJob({ ...editJob, status: e.target.value as JobStatus })}
                  sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13, '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' } }}>
                  {Object.entries(JOB_STATUS_CONFIG).map(([key, val]) => (
                    <MenuItem key={key} value={key}>{lang === 'he' ? val.he : val.label}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Box><Label text={L("Revenue ($)","הכנסה")} /><TextField fullWidth size="small" type="number" value={editJob.revenue || 0} onChange={(e) => setEditJob({ ...editJob, revenue: parseFloat(e.target.value) || 0 })} /></Box>
                <Box><Label text={L("Materials Cost ($)","עלות חומרים")} /><TextField fullWidth size="small" type="number" value={editJob.materials || 0} onChange={(e) => setEditJob({ ...editJob, materials: parseFloat(e.target.value) || 0 })} /></Box>
              </Box>
              <Box><Label text={L("Notes","הערות")} /><TextField fullWidth size="small" multiline rows={2} value={editJob.notes || ''} onChange={(e) => setEditJob({ ...editJob, notes: e.target.value })} /></Box>
            </>
          )}
        </Box>
      </ModalBase>

      {/* סגור עבודה Modal */}
      <ModalBase open={showCloseModal} onClose={() => { setShowCloseModal(false); closeJobRef.current = null; }} title={L('סגור עבודה ','סגור עבודה ') + (closeJob?.num || (closeJob ? formatJobNumber(closeJob.id) : ''))}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => { setShowCloseModal(false); closeJobRef.current = null; }}>{L('Cancel','ביטול')}</Button>
          <Button size="small" onClick={handleCloseJob}
            sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#22c55e', color: '#000' } }}>
            {L('סגור והשלם','סגור והשלם')}
          </Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box sx={{ bgcolor: 'rgba(79,70,229,0.08)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', p: '12px 16px', fontSize: 12, color: '#A8A29E', lineHeight: 1.7 }}>
            {L('Client','לקוח')}: <strong>{closeJob?.client}</strong><br />
            {L('Address','כתובת')}: {closeJob?.address || '—'}<br />
            {L('Technician','טכנאי')}: {closeJob?.tech || L('Unassigned','לא שויך')}
            {closeTech && <><br />{L('Commission Rate','אחוז עמלה')}: <strong>{closeCommRate}%</strong></>}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Total Revenue","סכום הכנסה")} /><TextField fullWidth size="small" type="number" value={closeRevenue} onChange={(e) => setCloseRevenue(parseFloat(e.target.value) || 0)} /></Box>
            <Box><Label text={L("Materials Cost","עלות חומרים")} /><TextField fullWidth size="small" type="number" value={closeMaterials} onChange={(e) => setCloseMaterials(parseFloat(e.target.value) || 0)} /></Box>
          </Box>
          <Box><Label text={L("Payment Method","אמצעי תשלום")} /><Select fullWidth size="small" value={closePayment} onChange={(e) => setClosePayment(e.target.value)}>
            <MenuItem value="cash">{L('Cash','מזומן')}</MenuItem>
            <MenuItem value="credit_card">{L('Credit Card','כרטיס אשראי')}</MenuItem>
            <MenuItem value="check">{L('Check','צק')}</MenuItem>
            <MenuItem value="bank_transfer">{L('Bank Transfer','העברה בנקאית')}</MenuItem>
            <MenuItem value="bit">{L('Bit / PayBox','ביט / פייבוקס')}</MenuItem>
            <MenuItem value="other">{L('Other','אחר')}</MenuItem>
          </Select></Box>
          {closeRevenue > 0 && (
            <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', p: '12px 16px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 12, color: '#78716C' }}>{L('Revenue','הכנסה')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(closeRevenue, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 12, color: '#78716C' }}>{L('Materials','חומרים')}</Typography>
                <Typography sx={{ fontSize: 12, color: '#ff4d6d' }}>-{formatCurrency(closeMaterials, currency)}</Typography>
              </Box>
              {taxRate > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                  <Typography sx={{ fontSize: 12, color: '#78716C' }}>{L(`Tax (${taxRate}%)`,`מס (${taxRate}%)`)}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#f59e0b' }}>-{formatCurrency(closeTax, currency)}</Typography>
                </Box>
              )}
              {taxRate === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                  <Typography sx={{ fontSize: 11, color: '#78716C', fontStyle: 'italic' }}>{L('No tax configured — set in Settings','לא הוגדר מס — הגדר בהגדרות')}</Typography>
                </Box>
              )}
              {closeCommRate > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                  <Typography sx={{ fontSize: 12, color: '#78716C' }}>{L(`Commission (${closeCommRate}%)`,`עמלה (${closeCommRate}%)`)}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#a78bfa' }}>-{formatCurrency(closeCommission, currency)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{L("Net Profit","רווח נקי")}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: closeProfit >= 0 ? '#4F46E5' : '#ff4d6d' }}>{formatCurrency(closeProfit, currency)}</Typography>
              </Box>
            </Box>
          )}
          <Box><Label text={L("Closing Notes","הערות סגירה")} /><TextField fullWidth size="small" multiline rows={2} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} /></Box>
        </Box>
      </ModalBase>
    </Box>
  );
}
