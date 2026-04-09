'use client';
import { useState, useMemo } from 'react';
import { Box, Button, Typography, Chip, Dialog, DialogContent, DialogActions, TextField, Select, MenuItem, IconButton, SwipeableDrawer } from '@mui/material';
import { Close, Phone, Navigation, Chat, AccessTime, LocationOn, Person, Description, CalendarMonth, AttachMoney } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatJobNumber, formatCurrency } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job, JobStatus } from '@/types';

const STATUS_FLOW: { status: JobStatus; label: string; icon: string; color: string; from: string[] }[] = [
  { status: 'in_progress', label: 'התחל עבודה', icon: '▶️', color: '#D97706', from: ['assigned','scheduled','callback','no_answer','parts_arrived'] },
  { status: 'waiting_parts', label: 'ממתין לחלקים', icon: '📦', color: '#7C3AED', from: ['in_progress'] },
  { status: 'parts_arrived', label: 'חלקים הגיעו', icon: '✅', color: '#059669', from: ['waiting_parts'] },
  { status: 'no_answer', label: 'לקוח לא עונה', icon: '📵', color: '#E11D48', from: ['assigned','scheduled','callback'] },
  { status: 'callback', label: 'חזרה ללקוח', icon: '📞', color: '#D97706', from: ['assigned','scheduled','no_answer','in_progress'] },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 מזומן' },
  { value: 'credit_card', label: '💳 אשראי' },
  { value: 'check', label: '📝 צ׳ק' },
  { value: 'bank_transfer', label: '🏦 העברה בנקאית' },
  { value: 'bit', label: '📱 ביט' },
  { value: 'invoice', label: '📄 חשבונית' },
  { value: 'other', label: 'אחר' },
];

const AUTO_MSGS: Record<string, (j: Job, biz: string) => string> = {
  in_progress: (j, b) => `היי ${j.client || ''}, הטכנאי שלנו יצא אליך! צפי הגעה בקרוב. ${b}`,
  waiting_parts: (j, b) => `היי ${j.client || ''}, לעבודה שלך נדרשים חלקים. נעדכן ברגע שיגיעו. ${b}`,
  parts_arrived: (j, b) => `היי ${j.client || ''}, החלקים הגיעו! נתאם מועד להמשך. ${b}`,
  no_answer: (j, b) => `היי ${j.client || ''}, ניסינו ליצור קשר ולא הצלחנו. אנא חזרו אלינו. ${b}`,
  callback: (j, b) => `היי ${j.client || ''}, אנחנו חוזרים אליך בקשר לעבודה. ${b}`,
};

function waLink(phone: string, msg?: string) {
  const clean = phone.replace(/[^0-9]/g, '');
  const wa = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
  return 'https://wa.me/' + wa + (msg ? '?text=' + encodeURIComponent(msg) : '');
}

export default function TechJobsPage() {
  const { user } = useAuth();
  const { db, saveData, cfg } = useData();
  const { toast } = useToast();
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Job | null>(null);
  const [showClose, setShowClose] = useState(false);
  const [closeRevenue, setCloseRevenue] = useState(0);
  const [closeMaterials, setCloseMaterials] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [closePayment, setClosePayment] = useState('cash');
  const currency = cfg.currency || (cfg.region === 'IL' ? 'ILS' : 'USD');
  const bizName = cfg.biz_name || '';
  const techName = user?.name || '';

  const allJobs = useMemo(() => (db.jobs || []).filter((j: Job) => j.tech === techName), [db.jobs, techName]);
  
  const filtered = useMemo(() => {
    let list = allJobs;
    if (filter === 'active') list = list.filter((j: Job) => !['completed','cancelled'].includes(j.status));
    else if (filter === 'today') { const t = new Date().toISOString().slice(0,10); list = list.filter((j: Job) => (j.scheduledDate || j.date || '').startsWith(t)); }
    else if (filter === 'completed') list = list.filter((j: Job) => j.status === 'completed');
    if (search) { const q = search.toLowerCase(); list = list.filter((j: Job) => j.client?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q) || j.desc?.toLowerCase().includes(q)); }
    return list.sort((a: Job, b: Job) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [allJobs, filter, search]);

  const [waPrompt, setWaPrompt] = useState<{ phone: string; msg: string } | null>(null);

  const changeStatus = async (job: Job, status: JobStatus) => {
    // Open WhatsApp FIRST (before async) to avoid popup blocker
    let waUrl = '';
    if (job.phone && AUTO_MSGS[status]) {
      const msg = AUTO_MSGS[status](job, bizName);
      waUrl = waLink(job.phone, msg);
    }
    const jobs = [...(db.jobs || [])];
    const idx = jobs.findIndex((j: Job) => j.id === job.id);
    if (idx >= 0) { jobs[idx] = { ...jobs[idx], status }; await saveData({ ...db, jobs }); toast('סטטוס עודכן ✓'); setSelected({ ...jobs[idx] }); }
    if (waUrl) setWaPrompt({ phone: waUrl, msg: '' });
  };

  const openCloseDialog = (job: Job) => {
    setCloseRevenue(job.revenue || 0); setCloseMaterials(job.materials || 0); setCloseNotes(''); setClosePayment('cash'); setShowClose(true);
  };

  const closeJob = async () => {
    if (!selected) return;
    const jobs = [...(db.jobs || [])];
    const idx = jobs.findIndex((j: Job) => j.id === selected.id);
    if (idx >= 0) {
      jobs[idx] = { ...jobs[idx], status: 'completed' as JobStatus, revenue: closeRevenue, materials: closeMaterials, paymentMethod: closePayment, notes: (jobs[idx].notes || '') + (closeNotes ? '\n--- סגירת טכנאי ---\n' + closeNotes : '') };
      await saveData({ ...db, jobs }); toast('✅ עבודה נסגרה');
    }
    setShowClose(false); setSelected(null);
  };

  // Detail drawer content
  const DetailDrawer = ({ job }: { job: Job }) => {
    const sc = JOB_STATUS_CONFIG[job.status as keyof typeof JOB_STATUS_CONFIG];
    const actions = STATUS_FLOW.filter(a => a.from.includes(job.status));
    return (
      <Box sx={{ direction: 'rtl' }}>
        {/* Header */}
        <Box sx={{ background: `linear-gradient(135deg, ${sc?.hex || '#4F46E5'}15, ${sc?.hex || '#4F46E5'}08)`, p: '20px 20px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '4px' }}>
              <Typography sx={{ fontSize: 11, color: '#A8A29E', fontFamily: 'monospace' }}>{job.num || formatJobNumber(job.id)}</Typography>
              <Chip label={sc?.he || job.status} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: (sc?.hex || '#A8A29E') + '18', color: sc?.hex || '#A8A29E' }} />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#1C1917', mb: '2px' }}>{job.client}</Typography>
            {job.desc && <Typography sx={{ fontSize: 13, color: '#78716C' }}>{job.desc}</Typography>}
          </Box>
          <IconButton onClick={() => setSelected(null)} size="small"><Close /></IconButton>
        </Box>

        {/* Quick actions bar */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {job.phone && (
            <Button href={'tel:' + job.phone} sx={{ flex: 1, py: 1.5, borderRadius: 0, flexDirection: 'column', gap: '2px', fontSize: 10, color: '#059669', fontWeight: 600 }}>
              <Phone sx={{ fontSize: 20 }} />חייג
            </Button>
          )}
          {job.address && (
            <Button href={'https://waze.com/ul?q=' + encodeURIComponent(job.address)} target="_blank" sx={{ flex: 1, py: 1.5, borderRadius: 0, flexDirection: 'column', gap: '2px', fontSize: 10, color: '#2563EB', fontWeight: 600, borderRight: '1px solid rgba(0,0,0,0.06)', borderLeft: '1px solid rgba(0,0,0,0.06)' }}>
              <Navigation sx={{ fontSize: 20 }} />נווט
            </Button>
          )}
          {job.phone && (
            <Button href={waLink(job.phone)} target="_blank" sx={{ flex: 1, py: 1.5, borderRadius: 0, flexDirection: 'column', gap: '2px', fontSize: 10, color: '#25D366', fontWeight: 600 }}>
              <Chat sx={{ fontSize: 20 }} />וואטסאפ
            </Button>
          )}
        </Box>

        {/* Details */}
        <Box sx={{ p: '16px 20px' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px', letterSpacing: '0.5px' }}>פרטים</Typography>
          
          {[
            job.phone && { icon: <Phone sx={{ fontSize: 16 }} />, label: 'טלפון', value: job.phone },
            job.email && { icon: <Person sx={{ fontSize: 16 }} />, label: 'מייל', value: job.email },
            job.address && { icon: <LocationOn sx={{ fontSize: 16 }} />, label: 'כתובת', value: job.address },
            (job.scheduledDate || job.date) && { icon: <CalendarMonth sx={{ fontSize: 16 }} />, label: 'תאריך', value: (job.scheduledDate || job.date) + (job.scheduledTime || job.time ? ' · ' + (job.scheduledTime || job.time) : '') },
            job.duration && { icon: <AccessTime sx={{ fontSize: 16 }} />, label: 'משך', value: job.duration >= 60 ? (job.duration / 60) + ' שעות' : job.duration + ' דק׳' },
            job.desc && { icon: <Description sx={{ fontSize: 16 }} />, label: 'תיאור', value: job.desc },
            job.revenue && { icon: <AttachMoney sx={{ fontSize: 16 }} />, label: 'הכנסה', value: formatCurrency(job.revenue, currency) },
            job.notes && { icon: <Description sx={{ fontSize: 16 }} />, label: 'הערות', value: job.notes },
          ].filter(Boolean).map((item: any, i) => (
            <Box key={i} sx={{ display: 'flex', gap: '10px', py: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <Box sx={{ color: '#A8A29E', mt: '2px' }}>{item.icon}</Box>
              <Box>
                <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600 }}>{item.label}</Typography>
                <Typography sx={{ fontSize: 13, color: '#1C1917', lineHeight: 1.5 }}>{item.value}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Status actions */}
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <Box sx={{ p: '0 20px 16px' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px', letterSpacing: '0.5px' }}>עדכון סטטוס</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {actions.map(a => (
                <Button key={a.status} fullWidth onClick={() => changeStatus(job, a.status)}
                  sx={{ justifyContent: 'flex-start', py: '10px', px: '14px', borderRadius: '10px', fontSize: 13, fontWeight: 600, bgcolor: a.color + '0A', color: a.color, border: '1px solid ' + a.color + '20', gap: '8px' }}>
                  {a.icon} {a.label}
                </Button>
              ))}
              <Button fullWidth onClick={() => openCloseDialog(job)}
                sx={{ justifyContent: 'flex-start', py: '10px', px: '14px', borderRadius: '10px', fontSize: 13, fontWeight: 700, bgcolor: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)', gap: '8px' }}>
                ✅ סגור עבודה
              </Button>
            </Box>
          </Box>
        )}

        {/* Completed summary */}
        {job.status === 'completed' && job.revenue ? (
          <Box sx={{ p: '0 20px 20px' }}>
            <Box sx={{ bgcolor: 'rgba(5,150,105,0.06)', borderRadius: '12px', p: '14px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px', fontSize: 13 }}>
                <span style={{color:'#78716C'}}>הכנסה</span><strong style={{color:'#059669'}}>{formatCurrency(job.revenue, currency)}</strong>
              </Box>
              {job.materials ? <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '6px', fontSize: 13 }}>
                <span style={{color:'#78716C'}}>חומרים</span><span style={{color:'#E11D48'}}>-{formatCurrency(job.materials, currency)}</span>
              </Box> : null}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 15, fontWeight: 700 }}>
                <span>רווח</span><span style={{color:'#4F46E5'}}>{formatCurrency((job.revenue || 0) - (job.materials || 0), currency)}</span>
              </Box>
              {(job as any).paymentMethod && <Typography sx={{ fontSize: 11, color: '#A8A29E', mt: '6px' }}>💳 {PAYMENT_METHODS.find(p => p.value === (job as any).paymentMethod)?.label || (job as any).paymentMethod}</Typography>}
            </Box>
            {job.phone && (
              <Box sx={{ display: 'flex', gap: '8px', mt: '10px' }}>
                <Button size="small" fullWidth href={waLink(job.phone, `היי ${job.client}, תודה על העבודה! סכום: ${formatCurrency(job.revenue, currency)}. ${bizName}`)} target="_blank"
                  sx={{ borderRadius: '10px', fontSize: 11, bgcolor: 'rgba(37,211,102,0.08)', color: '#25D366', fontWeight: 600 }}>📄 קבלה בוואטסאפ</Button>
                <Button size="small" fullWidth href={'sms:' + job.phone + '?body=' + encodeURIComponent(`היי ${job.client}, תודה! סכום: ${formatCurrency(job.revenue, currency)}. ${bizName}`)}
                  sx={{ borderRadius: '10px', fontSize: 11, bgcolor: 'rgba(79,70,229,0.08)', color: '#4F46E5', fontWeight: 600 }}>💬 קבלה ב-SMS</Button>
              </Box>
            )}
          </Box>
        ) : null}
      </Box>
    );
  };

  return (
    <Box className="zk-fade-up">
      {/* Header */}
      <Box sx={{ px: '20px', pt: '8px', pb: '12px' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800 }}>העבודות שלי</Typography>
        <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{allJobs.length} עבודות</Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: '6px', px: '20px', mb: '12px', overflowX: 'auto', pb: '4px' }}>
        {[
          { key: 'active', label: 'פעילות', count: allJobs.filter((j: Job) => !['completed','cancelled'].includes(j.status)).length },
          { key: 'today', label: 'היום', count: allJobs.filter((j: Job) => (j.scheduledDate || j.date || '').startsWith(new Date().toISOString().slice(0,10))).length },
          { key: 'completed', label: 'הושלמו', count: allJobs.filter((j: Job) => j.status === 'completed').length },
          { key: 'all', label: 'הכל', count: allJobs.length },
        ].map(f => (
          <Chip key={f.key} label={`${f.label} (${f.count})`} size="small" onClick={() => setFilter(f.key)}
            sx={{ fontWeight: filter === f.key ? 700 : 400, bgcolor: filter === f.key ? 'rgba(79,70,229,0.08)' : 'transparent', color: filter === f.key ? '#4F46E5' : '#A8A29E', border: '1px solid ' + (filter === f.key ? 'rgba(79,70,229,0.2)' : 'rgba(0,0,0,0.06)'), flexShrink: 0 }} />
        ))}
      </Box>

      {/* Search */}
      <Box sx={{ px: '20px', mb: '12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#FAF7F4', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', px: '12px', gap: '8px' }}>
          <SearchIcon sx={{ fontSize: 18, color: '#A8A29E' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לקוח, כתובת..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, padding: '10px 0', fontSize: 13, fontFamily: 'inherit', direction: 'rtl' }} />
        </Box>
      </Box>

      {/* Job cards */}
      <Box sx={{ px: '20px', pb: '80px' }}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontSize: 32, mb: 1 }}>🔧</Typography>
            <Typography sx={{ fontSize: 14, color: '#78716C' }}>אין עבודות</Typography>
          </Box>
        ) : filtered.map((j: Job) => {
          const sc = JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG];
          return (
            <Box key={j.id} onClick={() => setSelected(j)} sx={{
              bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', p: '14px 16px', mb: '8px',
              borderRight: '4px solid ' + (sc?.hex || '#A8A29E'), cursor: 'pointer', transition: 'all 0.15s',
              '&:active': { transform: 'scale(0.98)' },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '6px' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{j.client}</Typography>
                <Chip label={sc?.he || j.status} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: (sc?.hex || '#A8A29E') + '15', color: sc?.hex || '#A8A29E' }} />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: 12, color: '#78716C' }}>
                {j.address && <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}><LocationOn sx={{ fontSize: 14 }} />{j.address}</Box>}
                {(j.scheduledTime || j.time) && <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}><AccessTime sx={{ fontSize: 14 }} />{j.scheduledTime || j.time}</Box>}
                {j.phone && <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Phone sx={{ fontSize: 14 }} />{j.phone}</Box>}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Detail drawer */}
      <SwipeableDrawer anchor="bottom" open={!!selected} onClose={() => setSelected(null)} onOpen={() => {}}
        PaperProps={{ sx: { borderRadius: '20px 20px 0 0', maxHeight: '90vh' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: '8px', pb: '4px' }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.12)' }} />
        </Box>
        {selected && <DetailDrawer job={selected} />}
      </SwipeableDrawer>

      {/* WhatsApp prompt */}
      {waPrompt && (
        <Box sx={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 300, bgcolor: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', p: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '92vw', width: 340, direction: 'rtl' }}>
          <Box sx={{ fontSize: 20 }}>💬</Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>שלח הודעה ללקוח?</Typography>
          </Box>
          <Button size="small" variant="contained" href={waPrompt.phone} target="_blank" onClick={() => setWaPrompt(null)}
            sx={{ bgcolor: '#25D366', fontSize: 12, fontWeight: 700, borderRadius: '20px', minWidth: 'auto', px: 2, '&:hover': { bgcolor: '#1da851' } }}>שלח</Button>
          <Button size="small" onClick={() => setWaPrompt(null)} sx={{ fontSize: 11, minWidth: 'auto', color: '#A8A29E' }}>✕</Button>
        </Box>
      )}

      {/* Close job dialog */}
      <Dialog open={showClose} onClose={() => setShowClose(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px', direction: 'rtl' } }}>
        <Box sx={{ p: '20px 20px 0' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>סגור עבודה — {selected?.num}</Typography>
        </Box>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>סכום הכנסה</Typography>
              <TextField fullWidth size="small" type="number" value={closeRevenue} onChange={e => setCloseRevenue(parseFloat(e.target.value) || 0)} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>עלות חומרים</Typography>
              <TextField fullWidth size="small" type="number" value={closeMaterials} onChange={e => setCloseMaterials(parseFloat(e.target.value) || 0)} />
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>אמצעי תשלום</Typography>
            <Select fullWidth size="small" value={closePayment} onChange={(e: any) => setClosePayment(e.target.value)}>
              {PAYMENT_METHODS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </Select>
          </Box>
          {closeRevenue > 0 && (
            <Box sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', p: '12px', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px', fontSize: 13 }}>
                <span style={{color:'#78716C'}}>הכנסה</span><strong style={{color:'#059669'}}>{formatCurrency(closeRevenue, currency)}</strong>
              </Box>
              {closeMaterials > 0 && <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px', fontSize: 13 }}>
                <span style={{color:'#78716C'}}>חומרים</span><span style={{color:'#E11D48'}}>-{formatCurrency(closeMaterials, currency)}</span>
              </Box>}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 15, fontWeight: 700 }}>
                <span>רווח</span><span style={{color:'#4F46E5'}}>{formatCurrency(closeRevenue - closeMaterials, currency)}</span>
              </Box>
            </Box>
          )}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>הערות</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="הערות סגירה..." />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setShowClose(false)}>ביטול</Button>
          <Button variant="contained" onClick={closeJob} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>✅ סגור</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
