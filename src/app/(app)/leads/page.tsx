'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, InputAdornment, Menu, MenuItem, Select } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatJobNumber, formatCurrency } from '@/lib/formatters';
import { LEAD_STATUS_CONFIG } from '@/lib/constants';
import type { Lead, LeadStatus, LeadSource, Job } from '@/types';

const SOURCE_OPTIONS: { key: LeadSource | 'all'; label: string; he: string; icon: string }[] = [
  { key: 'all', label: 'כל המקורות', he: 'כל המקורות', icon: '📋' },
  { key: 'ai_bot', label: 'בוט AI', he: 'בוט AI', icon: '🤖' },
  { key: 'phone', label: 'טלפון', he: 'טלפון', icon: '📞' },
  { key: 'web', label: 'אתר', he: 'אתר', icon: '🌐' },
  { key: 'referral', label: 'הפניה', he: 'הפניה', icon: '🤝' },
  { key: 'walk_in', label: 'נכנס', he: 'נכנס', icon: '🚪' },
  { key: 'manual', label: 'ידני', he: 'ידני', icon: '✏️' },
];

export default function LeadsPage() {
  const { db, saveData, cfg } = useData();
  const L = useL();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Partial<Lead>>({});
  const currency = cfg.currency || (cfg.region === 'IL' || cfg.lang === 'he' ? 'ILS' : 'USD');
  const today = new Date().toISOString().slice(0, 10);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuLead, setMenuLead] = useState<Lead | null>(null);

  // ── Status counts ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: (db.leads || []).length };
    (db.leads || []).forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return counts;
  }, [db.leads]);

  const leads = useMemo(() => {
    let filtered = [...(db.leads || [])];
    if (statusFilter !== 'all') filtered = filtered.filter((l) => l.status === statusFilter);
    if (sourceFilter !== 'all') filtered = filtered.filter((l) => l.source === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (l) => l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [db.leads, search, statusFilter, sourceFilter]);

  const openNew = () => {
    setEditLead({ name: '', phone: '', email: '', address: '', status: 'new', source: 'manual', notes: '', value: 0, followUpDate: '' });
    setShowModal(true);
  };

  const openEdit = (lead: Lead) => {
    setEditLead({ ...lead });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editLead.name?.trim()) { toast('הכנס שם ליד', '#ff4d6d'); return; }
    const leadsList = [...(db.leads || [])];
    if (editLead.id) {
      const idx = leadsList.findIndex((l) => l.id === editLead.id);
      if (idx >= 0) leadsList[idx] = editLead as Lead;
    } else {
      const maxId = leadsList.reduce((m, l) => Math.max(m, l.id || 0), 0);
      leadsList.push({ ...editLead, id: maxId + 1, created: new Date().toISOString() } as Lead);
    }
    await saveData({ ...db, leads: leadsList });
    setShowModal(false);
    toast(editLead.id ? '✅ ליד עודכן!' : '✅ ליד נוצר!');
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(L('Delete lead ','מחק ליד ') + lead.name + '?')) return;
    const leadsList = (db.leads || []).filter((l) => l.id !== lead.id);
    await saveData({ ...db, leads: leadsList });
    toast('ליד נמחק');
    handleCloseMenu();
  };

  const handleStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    const leadsList = [...(db.leads || [])];
    const idx = leadsList.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      leadsList[idx] = { ...leadsList[idx], status: newStatus };
      await saveData({ ...db, leads: leadsList });
      toast('סטטוס עודכן');
    }
    handleCloseMenu();
  };

  const handleConvertToJob = async (lead: Lead) => {
    const jobs = [...(db.jobs || [])];
    const maxId = jobs.reduce((m, j) => Math.max(m, j.id || 0), 0);
    const newJobId = maxId + 1;
    const newJob: Job = {
      id: newJobId,
      num: formatJobNumber(newJobId),
      client: lead.name,
      phone: lead.phone || '',
      address: lead.address || '',
      zip: lead.zip || '',
      desc: lead.desc || lead.notes || '',
      status: 'open',
      priority: 'normal',
      created: new Date().toISOString(),
      source: 'lead',
      notes: 'הומר מליד #' + lead.id,
    };
    jobs.push(newJob);

    const leadsList = [...(db.leads || [])];
    const idx = leadsList.findIndex((l) => l.id === lead.id);
    if (idx >= 0) leadsList[idx] = { ...leadsList[idx], status: 'converted' as LeadStatus };

    await saveData({ ...db, jobs, leads: leadsList });
    toast('✅ עבודה ' + newJob.num + ' נוצרה מליד!');
    handleCloseMenu();
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuLead(lead);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuLead(null);
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title={L('Leads / CRM','לידים / CRM')} subtitle={leads.length + L(' leads',' לידים')} actions={
        <Button variant="contained" size="small" onClick={openNew}>{L('+ ליד חדש','+ ליד חדש')}</Button>
      } />

      {/* ── Lead Funnel KPIs ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1, mb: 2 }}>
        {[
          { label: 'חדשים', count: statusCounts['new'] || 0, color: '#3B82F6', icon: '🆕' },
          { label: 'חמים', count: (statusCounts['hot'] || 0) + (statusCounts['warm'] || 0), color: '#F59E0B', icon: '🔥' },
          { label: 'יצרו קשר', count: statusCounts['contacted'] || 0, color: '#8B5CF6', icon: '📞' },
          { label: 'הומרו', count: statusCounts['converted'] || 0, color: '#10B981', icon: '✅' },
          { label: 'אבודים', count: (statusCounts['lost'] || 0) + (statusCounts['cold'] || 0), color: '#EF4444', icon: '❌' },
        ].map((s, i) => (
          <Box key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: `${s.color}08`, border: `1px solid ${s.color}20`, textAlign: 'center', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${s.color}15` } }}>
            <Typography sx={{ fontSize: 20 }}>{s.icon}</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.count}</Typography>
            <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* ── Filters ── */}
      <Box sx={{ display: 'flex', gap: '10px', mb: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="חיפוש לידים..." value={search} onChange={(e) => setSearch(e.target.value)}
          size="small" sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#78716C' }} /></InputAdornment> }}
        />
        {/* Source filter */}
        <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} size="small" displayEmpty
          sx={{ minWidth: 140, bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 11, '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' } }}>
          {SOURCE_OPTIONS.map((s) => (
            <MenuItem key={s.key} value={s.key} sx={{ fontSize: 12 }}>{s.icon} {lang === 'he' ? s.he : s.label}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* Status filter buttons with counts */}
      <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap', mb: '12px' }}>
        {['all', ...Object.keys(LEAD_STATUS_CONFIG)].map((s) => {
          const cfgItem = LEAD_STATUS_CONFIG[s as keyof typeof LEAD_STATUS_CONFIG];
          const count = statusCounts[s] || 0;
          return (
            <Button key={s} size="small" onClick={() => setStatusFilter(s)} sx={{
              px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
              bgcolor: statusFilter === s ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
              color: statusFilter === s ? '#4F46E5' : '#78716C',
              border: '1px solid ' + (statusFilter === s ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
            }}>
              {s === 'all' ? `הכל (${count})` : `${(lang==='he'?cfgItem?.he:cfgItem?.label) || s} (${count})`}
            </Button>
          );
        })}
      </Box>

      {/* ── Table ── */}
      {leads.length === 0 ? (
        <EmptyState icon="👥" title="אין לידים עדיין" subtitle="הוסף את הליד הראשון." actionLabel="+ ליד חדש" onAction={openNew} />
      ) : (
        <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<Lead>
            keyExtractor={(l) => l.id}
            columns={[
              { key: 'name', label: 'שם', render: (l) => <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{l.name}</Typography> },
              { key: 'phone', label: 'טלפון' },
              { key: 'email', label: 'אימייל' },
              { key: 'status', label: L('Status','סטטוס'), render: (l) => {
                const cfgItem = LEAD_STATUS_CONFIG[l.status as keyof typeof LEAD_STATUS_CONFIG];
                return <Badge label={(lang==='he'?cfgItem?.he:cfgItem?.label) || l.status} variant={cfgItem?.color || 'grey'} />;
              }},
              { key: 'source', label: L('Source','מקור'), render: (l) => {
                const src = SOURCE_OPTIONS.find((s) => s.key === l.source);
                return <Typography sx={{ fontSize: 11 }}>{src ? `${src.icon} ${lang==='he'?src.he:src.label}` : l.source || '—'}</Typography>;
              }},
              { key: 'value', label: 'ערך', render: (l) => l.value ? (
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(l.value, currency)}</Typography>
              ) : <Typography sx={{ color: '#78716C', fontSize: 11 }}>—</Typography> },
              { key: 'followUp', label: 'מעקב', render: (l) => {
                if (!l.followUpDate) return <Typography sx={{ color: '#78716C', fontSize: 11 }}>—</Typography>;
                const isOverdue = l.followUpDate < today && !['converted', 'lost'].includes(l.status);
                const isToday = l.followUpDate === today;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isOverdue && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ff4d6d', boxShadow: '0 0 6px #ff4d6d', flexShrink: 0 }} />}
                    {isToday && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', boxShadow: '0 0 6px #f59e0b', flexShrink: 0 }} />}
                    <Typography sx={{ fontSize: 11, color: isOverdue ? '#ff4d6d' : isToday ? '#f59e0b' : '#A8A29E', fontWeight: isOverdue || isToday ? 700 : 400 }}>
                      {formatDate(l.followUpDate)}
                    </Typography>
                  </Box>
                );
              }},
              { key: 'created', label: 'נוצר', render: (l) => formatDate(l.created) },
              { key: 'actions', label: '', width: 80, render: (l) => (
                <Button size="small" onClick={(e) => handleOpenMenu(e, l)}
                  sx={{ fontSize: 11, minWidth: 'auto', p: '3px 10px', bgcolor: 'rgba(0,0,0,0.03)', color: '#A8A29E', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px' }}>
                  ⋮ פעולות
                </Button>
              )},
            ]}
            data={leads}
            onRowClick={openEdit}
          />
        </Box>
      )}

      {/* ── Actions Menu ── */}
      <Menu
        anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}
        PaperProps={{ sx: { bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', minWidth: 200 } }}>
        <MenuItem onClick={() => { if (menuLead) openEdit(menuLead); handleCloseMenu(); }}
          sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
          ✏️ עריכת ליד
        </MenuItem>

        <Box sx={{ px: '16px', py: '6px', fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          שנה סטטוס
        </Box>
        {[
          { status: 'hot' as LeadStatus, icon: '🔥', label: 'סמן כחם' },
          { status: 'warm' as LeadStatus, icon: '🟡', label: 'סמן כחמים' },
          { status: 'cold' as LeadStatus, icon: '🧊', label: 'סמן כקר' },
          { status: 'contacted' as LeadStatus, icon: '📞', label: 'סמן כיצרו קשר' },
          { status: 'lost' as LeadStatus, icon: '❌', label: 'סמן כאבוד' },
        ].map((item) => (
          <MenuItem key={item.status}
            onClick={() => { if (menuLead) handleStatusChange(menuLead, item.status); }}
            sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
            {item.icon} {item.label}
          </MenuItem>
        ))}

        <Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', my: '4px' }} />

        <MenuItem onClick={() => { if (menuLead) handleConvertToJob(menuLead); }}
          sx={{ fontSize: 12, gap: '8px', color: '#4F46E5', fontWeight: 700, '&:hover': { bgcolor: 'rgba(79,70,229,0.08)' } }}>
          🔧 המר לעבודה
        </MenuItem>

        <MenuItem onClick={() => { if (menuLead) handleDelete(menuLead); }}
          sx={{ fontSize: 12, gap: '8px', color: '#ff4d6d', '&:hover': { bgcolor: 'rgba(255,77,109,0.1)' } }}>
          🗑️ מחק ליד
        </MenuItem>
      </Menu>

      {/* ── Edit/Create Modal ── */}
      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editLead.id ? 'עריכת ליד' : 'ליד חדש'}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button variant="contained" size="small" onClick={handleSave}>{editLead.id ? 'עדכן' : 'צור ליד'}</Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box><Label text={L("Name *","שם *")} />
            <TextField fullWidth size="small" value={editLead.name || ''} onChange={(e) => setEditLead({ ...editLead, name: e.target.value })} placeholder={L('John Smith','שם הלקוח')} /></Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Phone","טלפון")} />
              <TextField fullWidth size="small" value={editLead.phone || ''} onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })} placeholder={L('(555) 000-0000','050-0000000')} /></Box>
            <Box><Label text={L("Email","מייל")} />
              <TextField fullWidth size="small" value={editLead.email || ''} onChange={(e) => setEditLead({ ...editLead, email: e.target.value })} placeholder="email@example.com" /></Box>
          </Box>
          <Box><Label text={L("Address","כתובת")} />
            <TextField fullWidth size="small" value={editLead.address || ''} onChange={(e) => setEditLead({ ...editLead, address: e.target.value })} placeholder={L('123 Main St','רחוב הדוגמא 123')} /></Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Estimated Value ($)","ערך משוער")} />
              <TextField fullWidth size="small" type="number" value={editLead.value || ''} onChange={(e) => setEditLead({ ...editLead, value: parseFloat(e.target.value) || 0 })} placeholder="0" /></Box>
            <Box><Label text={L("Source","מקור")} />
              <Select fullWidth size="small" value={editLead.source || 'manual'} onChange={(e) => setEditLead({ ...editLead, source: e.target.value as LeadSource })}
                sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13, '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' } }}>
                {SOURCE_OPTIONS.filter((s) => s.key !== 'all').map((s) => (
                  <MenuItem key={s.key} value={s.key}>{s.icon} {lang === 'he' ? s.he : s.label}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          <Box><Label text={L("Follow-up Date","תאריך מעקב")} />
            <TextField fullWidth size="small" type="date" value={editLead.followUpDate || ''} onChange={(e) => setEditLead({ ...editLead, followUpDate: e.target.value })} /></Box>

          {editLead.id && (
            <Box><Label text={L("Status","סטטוס")} />
              <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['new', 'hot', 'warm', 'cold', 'contacted', 'converted', 'lost'] as LeadStatus[]).map((s) => (
                  <Button key={s} size="small" onClick={() => setEditLead({ ...editLead, status: s })}
                    sx={{
                      px: '12px', py: '5px', fontSize: 11, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
                      bgcolor: editLead.status === s ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
                      color: editLead.status === s ? '#4F46E5' : '#78716C',
                      border: '1px solid ' + (editLead.status === s ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
                    }}>
                    {s}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
          <Box><Label text={L("Notes","הערות")} />
            <TextField fullWidth size="small" multiline rows={3} value={editLead.notes || ''} onChange={(e) => setEditLead({ ...editLead, notes: e.target.value })} placeholder="הערות על הליד..." /></Box>
        </Box>
      </ModalBase>
    </Box>
  );
}
