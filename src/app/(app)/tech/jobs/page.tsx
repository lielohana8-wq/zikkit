'use client';
import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, InputAdornment, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatJobNumber, formatCurrency } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import type { Job, JobStatus } from '@/types';

const STATUS_ACTIONS: { status: JobStatus; label: string; icon: string; color: string; from: string[] }[] = [
  { status: 'in_progress', label: 'התחל עבודה', icon: '▶️', color: '#D97706', from: ['assigned','scheduled','callback','no_answer','parts_arrived'] },
  { status: 'waiting_parts', label: 'ממתין לחלקים', icon: '📦', color: '#7C3AED', from: ['in_progress'] },
  { status: 'parts_arrived', label: 'חלקים הגיעו', icon: '✅', color: '#059669', from: ['waiting_parts'] },
  { status: 'no_answer', label: 'לקוח לא עונה', icon: '📵', color: '#E11D48', from: ['assigned','scheduled','callback'] },
  { status: 'callback', label: 'חזרה ללקוח', icon: '📞', color: '#D97706', from: ['assigned','scheduled','no_answer','in_progress'] },
];

export default function TechJobsPage() {
  const { user } = useAuth();
  const { db, saveData, cfg } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showClose, setShowClose] = useState(false);
  const [closeRevenue, setCloseRevenue] = useState(0);
  const [closeMaterials, setCloseMaterials] = useState(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [closePayment, setClosePayment] = useState('cash');
  const currency = cfg.currency || (cfg.region === 'IL' ? 'ILS' : 'USD');
  const techName = user?.name || '';

  const myJobs = useMemo(() => {
    let list = (db.jobs || []).filter((j: Job) => j.tech === techName);
    if (statusFilter !== 'all') list = list.filter((j: Job) => j.status === statusFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter((j: Job) => j.client?.toLowerCase().includes(q) || j.desc?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q) || j.num?.includes(q)); }
    return list.sort((a: Job, b: Job) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [db.jobs, techName, search, statusFilter]);

  const sendWhatsApp = (phone: string, msg: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const waPhone = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
    window.open('https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg), '_blank');
  };

  const AUTO_MSGS: Record<string, (j: Job) => string> = {
    in_progress: (j) => 'היי ' + (j.client || '') + ', הטכנאי שלנו יצא אליך! צפי הגעה בקרוב. ' + (cfg.biz_name || ''),
    waiting_parts: (j) => 'היי ' + (j.client || '') + ', לעבודה שלך נדרשים חלקים נוספים. נעדכן אותך ברגע שהם יגיעו. ' + (cfg.biz_name || ''),
    parts_arrived: (j) => 'היי ' + (j.client || '') + ', החלקים לעבודה שלך הגיעו! נתאם איתך מועד להמשך הטיפול. ' + (cfg.biz_name || ''),
    no_answer: (j) => 'היי ' + (j.client || '') + ', ניסינו ליצור איתך קשר ולא הצלחנו. אנא חזור/חזרי אלינו בהקדם. ' + (cfg.biz_name || ''),
    callback: (j) => 'היי ' + (j.client || '') + ', אנחנו חוזרים אליך בקשר לעבודה. אנא השב/י כשנוח. ' + (cfg.biz_name || ''),
  };

  const changeStatus = async (job: Job, status: JobStatus) => {
    const jobs = [...(db.jobs || [])];
    const idx = jobs.findIndex((j: Job) => j.id === job.id);
    if (idx >= 0) { jobs[idx] = { ...jobs[idx], status }; await saveData({ ...db, jobs }); toast('סטטוס עודכן ✓'); }
    setSelectedJob(null);
    // Auto-send WhatsApp notification
    if (job.phone && AUTO_MSGS[status]) {
      const msg = AUTO_MSGS[status](job);
      if (confirm('שלח הודעת וואטסאפ ללקוח? ' + msg)) {
        sendWhatsApp(job.phone, msg);
      }
    }
  };

  const closeJob = async () => {
    if (!selectedJob) return;
    const jobs = [...(db.jobs || [])];
    const idx = jobs.findIndex((j: Job) => j.id === selectedJob.id);
    if (idx >= 0) {
      jobs[idx] = { ...jobs[idx], status: 'completed' as JobStatus, revenue: closeRevenue, materials: closeMaterials, paymentMethod: closePayment, notes: (jobs[idx].notes || '') + (closeNotes ? '\n--- סגירת טכנאי ---\n' + closeNotes : '') };
      await saveData({ ...db, jobs });
      toast('✅ עבודה נסגרה');
    }
    setShowClose(false); setSelectedJob(null);
  };

  const statuses = ['all','assigned','in_progress','scheduled','waiting_parts','parts_arrived','no_answer','callback','completed'];

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="העבודות שלי" subtitle={myJobs.length + ' עבודות משויכות'} />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: '8px', mb: 2, flexWrap: 'wrap', alignItems: 'center', px: '20px' }}>
        <TextField placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 180 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#A8A29E' }} /></InputAdornment> }} />
        {statuses.map(s => {
          const c = JOB_STATUS_CONFIG[s as keyof typeof JOB_STATUS_CONFIG];
          const count = s === 'all' ? myJobs.length : (db.jobs || []).filter((j: Job) => j.tech === techName && j.status === s).length;
          return (
            <Chip key={s} label={(c?.he || 'הכל') + ' (' + count + ')'} size="small" onClick={() => setStatusFilter(s)}
              sx={{ fontWeight: statusFilter === s ? 700 : 400, bgcolor: statusFilter === s ? 'rgba(79,70,229,0.08)' : 'transparent', color: statusFilter === s ? '#4F46E5' : '#A8A29E', border: '1px solid ' + (statusFilter === s ? 'rgba(79,70,229,0.2)' : 'rgba(0,0,0,0.06)') }} />
          );
        })}
      </Box>

      {myJobs.length === 0 ? (
        <EmptyState icon="🔧" title="אין עבודות משויכות" subtitle="עבודות שישויכו אליך יופיעו כאן." />
      ) : (
        <Box sx={{ px: '20px' }}>
          {myJobs.map((j: Job) => {
            const sc = JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG];
            const actions = STATUS_ACTIONS.filter(a => a.from.includes(j.status));
            return (
              <Box key={j.id} sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', p: '14px 16px', mb: '10px', borderRight: '3px solid ' + (sc?.hex || '#A8A29E') }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '8px' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#A8A29E', fontFamily: 'monospace' }}>{j.num || formatJobNumber(j.id)}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{j.client}</Typography>
                  <Badge label={sc?.he || j.status} variant={sc?.color || 'grey'} />
                </Box>

                {/* Details */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px', mb: '10px', fontSize: 12, color: '#78716C' }}>
                  {j.phone && <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📞 {j.phone}</Box>}
                  {j.address && <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {j.address}</Box>}
                  {(j.scheduledDate || j.date) && <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📅 {j.scheduledDate || j.date} {j.scheduledTime || j.time || ''}</Box>}
                  {j.desc && <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📝 {j.desc}</Box>}
                </Box>

                {/* Quick actions */}
                <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {j.phone && <Button size="small" href={'tel:' + j.phone} sx={{ borderRadius: '20px', fontSize: 11, bgcolor: 'rgba(5,150,105,0.08)', color: '#059669', fontWeight: 600 }}>📞 התקשר</Button>}
                  {j.address && <Button size="small" href={'https://waze.com/ul?q=' + encodeURIComponent(j.address)} target="_blank" sx={{ borderRadius: '20px', fontSize: 11, bgcolor: 'rgba(37,99,235,0.08)', color: '#2563EB', fontWeight: 600 }}>🗺️ נווט</Button>}
                  {j.phone && <Button size="small" href={'https://wa.me/' + (j.phone.startsWith('0') ? '972' + j.phone.slice(1) : j.phone).replace(/[^0-9]/g,'')} target="_blank" sx={{ borderRadius: '20px', fontSize: 11, bgcolor: 'rgba(37,211,102,0.08)', color: '#25D366', fontWeight: 600 }}>💬 וואטסאפ</Button>}

                  {/* Status actions */}
                  {actions.map(a => (
                    <Button key={a.status} size="small" onClick={() => changeStatus(j, a.status)}
                      sx={{ borderRadius: '20px', fontSize: 11, bgcolor: a.color + '12', color: a.color, fontWeight: 600, border: '1px solid ' + a.color + '25' }}>
                      {a.icon} {a.label}
                    </Button>
                  ))}
                  {j.status !== 'completed' && j.status !== 'cancelled' && (
                    <Button size="small" onClick={() => { setSelectedJob(j); setCloseRevenue(j.revenue || 0); setCloseMaterials(j.materials || 0); setCloseNotes(''); setClosePayment('cash'); setShowClose(true); }}
                      sx={{ borderRadius: '20px', fontSize: 11, bgcolor: 'rgba(5,150,105,0.1)', color: '#059669', fontWeight: 700, border: '1px solid rgba(5,150,105,0.2)' }}>
                      ✅ סגור עבודה
                    </Button>
                  )}
                </Box>

                {/* Revenue if completed */}
                {j.status === 'completed' && j.revenue ? (
                  <Box sx={{ mt: '8px' }}>
                    <Box sx={{ p: '8px 12px', bgcolor: 'rgba(5,150,105,0.06)', borderRadius: '8px', display: 'flex', gap: '16px', fontSize: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>💰 הכנסה: <strong>{formatCurrency(j.revenue, currency)}</strong></span>
                      {j.materials ? <span>🔧 חומרים: <strong>{formatCurrency(j.materials, currency)}</strong></span> : null}
                      <span>📊 רווח: <strong style={{color:'#059669'}}>{formatCurrency((j.revenue || 0) - (j.materials || 0), currency)}</strong></span>
                      {(j as any).paymentMethod && <Badge label={({'cash':'מזומן','credit_card':'אשראי','check':'צ׳ק','bank_transfer':'העברה','bit':'ביט','invoice':'חשבונית','other':'אחר'} as any)[(j as any).paymentMethod] || (j as any).paymentMethod} variant="accent" />}
                    </Box>
                    {j.phone && (
                      <Box sx={{ display: 'flex', gap: '6px', mt: '6px' }}>
                        <Button size="small" href={'https://wa.me/' + (j.phone.startsWith('0') ? '972' + j.phone.slice(1) : j.phone).replace(/[^0-9]/g,'') + '?text=' + encodeURIComponent('היי ' + j.client + ', תודה על העבודה! סכום: ' + formatCurrency(j.revenue, currency) + '. ' + (cfg.biz_name || 'Zikkit'))} target="_blank"
                          sx={{ borderRadius: '20px', fontSize: 10, bgcolor: 'rgba(37,211,102,0.08)', color: '#25D366', fontWeight: 600 }}>📄 שלח קבלה בוואטסאפ</Button>
                        <Button size="small" href={'sms:' + j.phone + '?body=' + encodeURIComponent('היי ' + j.client + ', תודה! סכום: ' + formatCurrency(j.revenue, currency))}
                          sx={{ borderRadius: '20px', fontSize: 10, bgcolor: 'rgba(79,70,229,0.08)', color: '#4F46E5', fontWeight: 600 }}>💬 שלח קבלה ב-SMS</Button>
                      </Box>
                    )}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Close Job Dialog */}
      <Dialog open={showClose} onClose={() => setShowClose(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px', direction: 'rtl' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>סגור עבודה — {selectedJob?.num}</DialogTitle>
        <DialogContent>
          <Box sx={{ bgcolor: 'rgba(79,70,229,0.06)', borderRadius: '10px', p: '12px', mb: 2, fontSize: 13, color: '#78716C' }}>
            📋 לקוח: <strong style={{color:'#1C1917'}}>{selectedJob?.client}</strong><br/>
            📍 כתובת: {selectedJob?.address || '—'}
          </Box>
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
          {closeRevenue > 0 && (
            <Box sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', p: '12px', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px', fontSize: 12 }}>
                <span style={{color:'#78716C'}}>הכנסה</span><strong style={{color:'#059669'}}>{formatCurrency(closeRevenue, currency)}</strong>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px', fontSize: 12 }}>
                <span style={{color:'#78716C'}}>חומרים</span><span style={{color:'#E11D48'}}>-{formatCurrency(closeMaterials, currency)}</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 14, fontWeight: 700 }}>
                <span>רווח</span><span style={{color:'#4F46E5'}}>{formatCurrency(closeRevenue - closeMaterials, currency)}</span>
              </Box>
            </Box>
          )}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>אמצעי תשלום</Typography>
            <Select fullWidth size="small" value={closePayment} onChange={(e: any) => setClosePayment(e.target.value)}>
              <MenuItem value="cash">💵 מזומן</MenuItem>
              <MenuItem value="credit_card">💳 כרטיס אשראי</MenuItem>
              <MenuItem value="check">📝 צ׳ק</MenuItem>
              <MenuItem value="bank_transfer">🏦 העברה בנקאית</MenuItem>
              <MenuItem value="bit">📱 ביט / פייבוקס</MenuItem>
              <MenuItem value="invoice">📄 חשבונית (לתשלום מאוחר)</MenuItem>
              <MenuItem value="other">אחר</MenuItem>
            </Select>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>הערות סגירה</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="עבודה הושלמה..." />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowClose(false)}>ביטול</Button>
          <Button variant="contained" onClick={closeJob} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>✅ סגור והשלם</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
