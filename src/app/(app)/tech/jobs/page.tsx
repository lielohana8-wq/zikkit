'use client';
import { useState, useMemo } from 'react';
import { Box, Button, Typography, Chip, Dialog, DialogContent, DialogActions, TextField, Select, MenuItem, IconButton, SwipeableDrawer, Divider } from '@mui/material';
import { Close, Phone, Navigation, Chat, AccessTime, LocationOn, Delete, Add, CameraAlt } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatJobNumber, formatCurrency } from '@/lib/formatters';
import { JOB_STATUS_CONFIG } from '@/lib/constants';
import { getFirestoreDb, doc as fbDoc, setDoc as fbSetDoc } from '@/lib/firebase';
import type { Job, JobStatus } from '@/types';

const STATUS_FLOW: { status: JobStatus; label: string; icon: string; color: string; from: string[] }[] = [
  { status: 'in_progress', label: 'התחל עבודה', icon: '▶️', color: '#D97706', from: ['open','assigned','scheduled','callback','no_answer','parts_arrived'] },
  { status: 'waiting_parts', label: 'ממתין לחלקים', icon: '📦', color: '#7C3AED', from: ['in_progress'] },
  { status: 'parts_arrived', label: 'חלקים הגיעו', icon: '✅', color: '#059669', from: ['waiting_parts'] },
  { status: 'no_answer', label: 'לקוח לא עונה', icon: '📵', color: '#E11D48', from: ['open','assigned','scheduled','callback'] },
  { status: 'callback', label: 'חזרה ללקוח', icon: '📞', color: '#D97706', from: ['open','assigned','scheduled','no_answer','in_progress'] },
];
const PAYMENTS = [
  { value: 'cash', label: '💵 מזומן' }, { value: 'credit_card', label: '💳 אשראי' },
  { value: 'check', label: '📝 צ׳ק' }, { value: 'bank_transfer', label: '🏦 העברה' },
  { value: 'bit', label: '📱 ביט' }, { value: 'invoice', label: '📄 חשבונית' },
];
const AUTO_MSGS: Record<string, (j: Job, b: string) => string> = {
  in_progress: (j, b) => `היי ${j.client}, הטכנאי יצא אליך! ${b}`,
  waiting_parts: (j, b) => `היי ${j.client}, נדרשים חלקים. נעדכן כשיגיעו. ${b}`,
  parts_arrived: (j, b) => `היי ${j.client}, החלקים הגיעו! נתאם מועד. ${b}`,
  no_answer: (j, b) => `היי ${j.client}, ניסינו להתקשר. אנא חזרו אלינו. ${b}`,
  callback: (j, b) => `היי ${j.client}, חוזרים אליך בקשר לעבודה. ${b}`,
};
const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '📝 טיוטה', color: '#78716C' }, sent: { label: '📨 נשלח', color: '#4F46E5' },
  viewed: { label: '👁️ נצפה', color: '#D97706' }, approved: { label: '✅ אושר', color: '#059669' }, declined: { label: '❌ נדחה', color: '#E11D48' },
};

function waLink(phone: string, msg?: string) {
  const c = phone.replace(/[^0-9]/g, '');
  const w = c.startsWith('0') ? '972' + c.slice(1) : c;
  return 'https://wa.me/' + w + (msg ? '?text=' + encodeURIComponent(msg) : '');
}

interface LineItem { id: number; name: string; qty: number; price: number; image?: string; }

export default function TechJobsPage() {
  const { user } = useAuth();
  const { db, saveData, cfg } = useData();
  const { toast } = useToast();
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Job | null>(null);
  const [tab, setTab] = useState<'info' | 'quote'>('info');
  const [showClose, setShowClose] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [closePayment, setClosePayment] = useState('cash');
  const [closeMaterials, setCloseMaterials] = useState(0);
  const [closeManualRevenue, setCloseManualRevenue] = useState(0);
  const [waPrompt, setWaPrompt] = useState<{ url: string } | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [jobPhotos, setJobPhotos] = useState<string[]>([]);
  const [jobNote, setJobNote] = useState('');
  const [newItem, setNewItem] = useState({ name: '', qty: 1, price: 0 });
  const currency = cfg.currency || (cfg.region === 'IL' ? 'ILS' : 'USD');
  const sym = currency === 'ILS' ? '₪' : '$';
  const bizName = cfg.biz_name || '';
  const techName = user?.name || '';
  const products = db.products || [];
  const allJobs = useMemo(() => (db.jobs || []).filter((j: Job) => j.tech === techName), [db.jobs, techName]);
  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  const filtered = useMemo(() => {
    let list = allJobs;
    if (filter === 'active') list = list.filter((j: Job) => !['completed','cancelled'].includes(j.status));
    else if (filter === 'today') { const t = new Date().toISOString().slice(0,10); list = list.filter((j: Job) => (j.scheduledDate || j.date || '').startsWith(t)); }
    else if (filter === 'completed') list = list.filter((j: Job) => j.status === 'completed');
    if (search) { const q = search.toLowerCase(); list = list.filter((j: Job) => j.client?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q)); }
    return list.sort((a: Job, b: Job) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [allJobs, filter, search]);

  const openJob = (job: Job) => { setSelected(job); setItems(job.lineItems || []); setJobPhotos(job.photos || []); setJobNote(''); setTab('info'); };
  const saveItems = async (ni: LineItem[]) => { setItems(ni); if (!selected) return; const jobs = [...(db.jobs || [])]; const idx = jobs.findIndex((j: Job) => j.id === selected.id); if (idx >= 0) { jobs[idx] = { ...jobs[idx], lineItems: ni, revenue: ni.reduce((s, i) => s + i.price * i.qty, 0) }; await saveData({ ...db, jobs }); setSelected({ ...jobs[idx] }); } };
  const addProduct = (p: any) => saveItems([...items, { id: Date.now(), name: p.name, qty: 1, price: p.price || 0 }]);
  const addCustomItem = () => { if (!newItem.name.trim()) return; saveItems([...items, { id: Date.now(), ...newItem }]); setNewItem({ name: '', qty: 1, price: 0 }); };
  const removeItem = (id: number) => saveItems(items.filter(i => i.id !== id));
  const updateItem = (id: number, field: string, value: any) => saveItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  const addPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/jpeg', 0.7);
        const np = [...jobPhotos, url]; setJobPhotos(np);
        if (selected) { const jobs = [...(db.jobs || [])]; const idx = jobs.findIndex((j: Job) => j.id === selected.id); if (idx >= 0) { jobs[idx] = { ...jobs[idx], photos: np }; saveData({ ...db, jobs }); } }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addItemPhoto = (itemId: number) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = (e: any) => { const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader(); reader.onload = (ev) => { const img = new Image(); img.onload = () => {
        const canvas = document.createElement('canvas'); const scale = Math.min(1, 400 / Math.max(img.width, img.height));
        canvas.width = img.width * scale; canvas.height = img.height * scale; canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        updateItem(itemId, 'image', canvas.toDataURL('image/jpeg', 0.6));
      }; img.src = ev.target?.result as string; }; reader.readAsDataURL(file);
    }; inp.click();
  };

  const changeStatus = async (job: Job, status: JobStatus) => {
    let waUrl = '';
    if (job.phone && AUTO_MSGS[status]) waUrl = waLink(job.phone, AUTO_MSGS[status](job, bizName));
    const jobs = [...(db.jobs || [])]; const idx = jobs.findIndex((j: Job) => j.id === job.id);
    if (idx >= 0) { jobs[idx] = { ...jobs[idx], status }; await saveData({ ...db, jobs }); toast('סטטוס עודכן ✓'); setSelected({ ...jobs[idx] }); }
    if (waUrl) setWaPrompt({ url: waUrl });
  };

  const sendQuote = async (method: 'whatsapp' | 'sms' | 'copy') => {
    if (!selected || items.length === 0) return;
    const token = 'quote_' + Date.now();
    try {
      const firestore = getFirestoreDb();
      await fbSetDoc(fbDoc(firestore, 'public_portals', token), {
        type: 'quote', quoteStatus: 'sent', bizName, bizPhone: cfg.biz_phone || '',
        client: selected.client, phone: selected.phone || '', address: selected.address || '', desc: selected.desc || '',
        techName, num: selected.num || formatJobNumber(selected.id), jobId: selected.id,
        items, photos: jobPhotos, currency, created: new Date().toISOString(),
      });
      const jobs = [...(db.jobs || [])]; const idx = jobs.findIndex((j: Job) => j.id === selected.id);
      if (idx >= 0) { jobs[idx] = { ...jobs[idx], quoteStatus: 'sent', quoteTotal: itemsTotal, quoteSentAt: new Date().toISOString() }; await saveData({ ...db, jobs }); setSelected({ ...jobs[idx] }); }
      const url = window.location.origin + '/quote/' + token;
      if (method === 'whatsapp' && selected.phone) { window.open(waLink(selected.phone, 'היי ' + selected.client + ', הנה הצעת מחיר מ-' + bizName + ': ' + url), '_blank'); }
      else if (method === 'sms' && selected.phone) { window.open('sms:' + selected.phone + '?body=' + encodeURIComponent('הצעת מחיר מ-' + bizName + ': ' + url)); }
      else if (method === 'copy') { navigator.clipboard?.writeText(url).then(() => toast('📋 קישור הועתק')); }
      toast('📨 הצעה נשלחה');
    } catch (e) { console.error(e); toast('שגיאה'); }
  };

  const closeJob = async () => {
    if (!selected) return;
    const revenue = closeManualRevenue || itemsTotal || 0;
    const jobs = [...(db.jobs || [])]; const idx = jobs.findIndex((j: Job) => j.id === selected.id);
    if (idx >= 0) {
      jobs[idx] = { ...jobs[idx], status: 'completed' as JobStatus, revenue, materials: closeMaterials, paymentMethod: closePayment, lineItems: items, photos: jobPhotos, notes: (jobs[idx].notes || '') + (closeNotes ? '\n--- סגירת טכנאי ---\n' + closeNotes : '') };
      await saveData({ ...db, jobs }); toast('✅ עבודה נסגרה');
      const token = 'rcpt_' + Date.now();
      try {
        const firestore = getFirestoreDb();
        await fbSetDoc(fbDoc(firestore, 'public_portals', token), {
          type: 'receipt', bizName, bizPhone: cfg.biz_phone || '', client: selected.client, phone: selected.phone || '', address: selected.address || '',
          desc: selected.desc || '', techName, num: selected.num || formatJobNumber(selected.id), jobId: selected.id,
          revenue, materials: closeMaterials, paymentMethod: closePayment, items, photos: jobPhotos,
          currency, created: new Date().toISOString(),
        });
        if (selected.phone) { setWaPrompt({ url: waLink(selected.phone, 'היי ' + selected.client + ', תודה! הנה הקבלה: ' + window.location.origin + '/receipt/' + token + ' — ' + bizName) }); }
      } catch (e) { console.warn(e); }
    }
    setShowClose(false); setSelected(null);
  };

  return (
    <Box className="zk-fade-up">
      <Box sx={{ px: '20px', pt: '8px', pb: '12px' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800 }}>העבודות שלי</Typography>
        <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{allJobs.length} עבודות</Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: '6px', px: '20px', mb: '10px', overflowX: 'auto', pb: '4px' }}>
        {[{ key: 'active', label: 'פעילות' }, { key: 'today', label: 'היום' }, { key: 'completed', label: 'הושלמו' }, { key: 'all', label: 'הכל' }].map(f => (
          <Chip key={f.key} label={f.label} size="small" onClick={() => setFilter(f.key)}
            sx={{ fontWeight: filter === f.key ? 700 : 400, bgcolor: filter === f.key ? '#4F46E515' : 'transparent', color: filter === f.key ? '#4F46E5' : '#A8A29E', border: '1px solid ' + (filter === f.key ? '#4F46E530' : 'rgba(0,0,0,0.06)'), flexShrink: 0 }} />
        ))}
      </Box>

      {/* Search */}
      <Box sx={{ px: '20px', mb: '10px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#FAF7F4', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', px: '12px', gap: '8px' }}>
          <SearchIcon sx={{ fontSize: 18, color: '#A8A29E' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, padding: '10px 0', fontSize: 13, fontFamily: 'inherit', direction: 'rtl' }} />
        </Box>
      </Box>

      {/* Job Cards */}
      <Box sx={{ px: '20px', pb: '80px' }}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><Typography sx={{ fontSize: 32, mb: 1 }}>🔧</Typography><Typography sx={{ fontSize: 14, color: '#78716C' }}>אין עבודות</Typography></Box>
        ) : filtered.map((j: Job) => {
          const sc = JOB_STATUS_CONFIG[j.status as keyof typeof JOB_STATUS_CONFIG];
          const qs = j.quoteStatus ? QUOTE_STATUS[j.quoteStatus] : null;
          return (
            <Box key={j.id} onClick={() => openJob(j)} sx={{
              bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', p: '14px 16px', mb: '8px',
              borderRight: '4px solid ' + (sc?.hex || '#A8A29E'), cursor: 'pointer', '&:active': { transform: 'scale(0.98)' },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '4px' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{j.client}</Typography>
                <Chip label={sc?.he || j.status} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: (sc?.hex || '#A8A29E') + '15', color: sc?.hex }} />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: 12, color: '#78716C' }}>
                {j.address && <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}><LocationOn sx={{ fontSize: 14 }} />{j.address}</Box>}
                {(j.scheduledTime || j.time) && <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}><AccessTime sx={{ fontSize: 14 }} />{j.scheduledTime || j.time}</Box>}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '6px', flexWrap: 'wrap' }}>
                {j.lineItems && j.lineItems.length > 0 && <Chip label={formatCurrency(j.lineItems.reduce((s: number, i: any) => s + i.price * i.qty, 0), currency)} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#4F46E510', color: '#4F46E5' }} />}
                {qs && <Chip label={qs.label} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: qs.color + '12', color: qs.color }} />}
                {j.status !== 'completed' && j.status !== 'cancelled' && (
                  <Chip label="💰 הצעת מחיר" size="small" onClick={(e) => { e.stopPropagation(); openJob(j); setTimeout(() => setTab('quote'), 50); }}
                    sx={{ height: 22, fontSize: 10, cursor: 'pointer', bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', '&:hover': { bgcolor: '#4F46E508' } }} />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ═══ Job Detail Drawer ═══ */}
      <SwipeableDrawer anchor="bottom" open={!!selected} onClose={() => setSelected(null)} onOpen={() => {}}
        PaperProps={{ sx: { borderRadius: '20px 20px 0 0', maxHeight: '92vh', direction: 'rtl' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: '8px', pb: '4px' }}><Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.12)' }} /></Box>
        {selected && (() => {
          const sc = JOB_STATUS_CONFIG[selected.status as keyof typeof JOB_STATUS_CONFIG];
          const actions = STATUS_FLOW.filter(a => a.from.includes(selected.status));
          return (<>
            {/* Header */}
            <Box sx={{ p: '12px 20px', display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '2px' }}>
                  <Typography sx={{ fontSize: 10, color: '#A8A29E', fontFamily: 'monospace' }}>{selected.num || formatJobNumber(selected.id)}</Typography>
                  <Chip label={sc?.he || selected.status} size="small" sx={{ height: 20, fontSize: 9, fontWeight: 700, bgcolor: (sc?.hex || '#A8A29E') + '18', color: sc?.hex }} />
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{selected.client}</Typography>
              </Box>
              <IconButton onClick={() => setSelected(null)} size="small"><Close /></IconButton>
            </Box>

            {/* Quick action bar */}
            <Box sx={{ display: 'flex', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {selected.phone && <Button href={'tel:' + selected.phone} sx={{ flex: 1, py: 1, borderRadius: 0, flexDirection: 'column', gap: '1px', fontSize: 10, color: '#059669' }}><Phone sx={{ fontSize: 18 }} />חייג</Button>}
              {selected.address && <Button href={'https://waze.com/ul?q=' + encodeURIComponent(selected.address)} target="_blank" sx={{ flex: 1, py: 1, borderRadius: 0, flexDirection: 'column', gap: '1px', fontSize: 10, color: '#2563EB', borderRight: '1px solid rgba(0,0,0,0.06)', borderLeft: '1px solid rgba(0,0,0,0.06)' }}><Navigation sx={{ fontSize: 18 }} />נווט</Button>}
              {selected.phone && <Button href={waLink(selected.phone)} target="_blank" sx={{ flex: 1, py: 1, borderRadius: 0, flexDirection: 'column', gap: '1px', fontSize: 10, color: '#25D366' }}><Chat sx={{ fontSize: 18 }} />וואטסאפ</Button>}
            </Box>

            {/* 2 Tabs */}
            <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {[{ key: 'info', label: '📋 פרטים ופעולות' }, { key: 'quote', label: '💰 הצעת מחיר' + (items.length > 0 ? ' (' + formatCurrency(itemsTotal, currency) + ')' : '') }].map(t => (
                <Button key={t.key} onClick={() => setTab(t.key as any)} sx={{ flex: 1, py: 1, borderRadius: 0, fontSize: 12, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? '#4F46E5' : '#A8A29E', borderBottom: tab === t.key ? '2px solid #4F46E5' : '2px solid transparent' }}>{t.label}</Button>
              ))}
            </Box>

            <Box sx={{ maxHeight: '55vh', overflow: 'auto', p: '14px 20px' }}>
              {/* ═══ TAB: INFO + ACTIONS ═══ */}
              {tab === 'info' && (<Box>
                {/* Details */}
                {[
                  selected.phone && { icon: '📞', label: 'טלפון', value: selected.phone },
                  selected.email && { icon: '📧', label: 'מייל', value: selected.email },
                  selected.address && { icon: '📍', label: 'כתובת', value: selected.address },
                  (selected.scheduledDate || selected.date) && { icon: '📅', label: 'תאריך', value: (selected.scheduledDate || selected.date) + ' ' + (selected.scheduledTime || selected.time || '') },
                  selected.duration && { icon: '⏱️', label: 'משך', value: selected.duration >= 60 ? (selected.duration / 60) + ' שעות' : selected.duration + ' דק׳' },
                  selected.desc && { icon: '📝', label: 'תיאור', value: selected.desc },
                  selected.notes && { icon: '💬', label: 'הערות', value: selected.notes },
                ].filter(Boolean).map((item: any, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: '10px', py: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <Typography sx={{ fontSize: 14, mt: '1px' }}>{item.icon}</Typography>
                    <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600 }}>{item.label}</Typography><Typography sx={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{item.value}</Typography></Box>
                  </Box>
                ))}

                {/* Photos */}
                <Box sx={{ mt: '12px', mb: '12px' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#78716C', mb: '6px' }}>📷 תמונות</Typography>
                  <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {jobPhotos.map((p, i) => (
                      <Box key={i} sx={{ position: 'relative', width: 64, height: 64, borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <IconButton size="small" onClick={() => { const np = jobPhotos.filter((_, idx) => idx !== i); setJobPhotos(np); if (selected) { const jobs = [...(db.jobs || [])]; const idx2 = jobs.findIndex((j: Job) => j.id === selected.id); if (idx2 >= 0) { jobs[idx2] = { ...jobs[idx2], photos: np }; saveData({ ...db, jobs }); } } }}
                          sx={{ position: 'absolute', top: -2, right: -2, bgcolor: 'rgba(0,0,0,0.5)', width: 18, height: 18 }}><Close sx={{ fontSize: 10, color: '#fff' }} /></IconButton>
                      </Box>
                    ))}
                    <Box onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment'; inp.multiple = true; inp.onchange = (e: any) => Array.from(e.target.files || []).forEach((f: any) => addPhoto(f)); inp.click(); }}
                      sx={{ width: 64, height: 64, borderRadius: '8px', border: '2px dashed rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: '#4F46E5' } }}>
                      <CameraAlt sx={{ fontSize: 18, color: '#A8A29E' }} /><Typography sx={{ fontSize: 8, color: '#A8A29E' }}>צלם</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Quick note */}
                <Box sx={{ display: 'flex', gap: '6px', mb: '14px' }}>
                  <TextField size="small" fullWidth value={jobNote} onChange={e => setJobNote(e.target.value)} placeholder="הוסף הערה..." sx={{ '& input': { fontSize: 12, p: '8px 12px' } }} />
                  <Button size="small" variant="contained" disabled={!jobNote.trim()} onClick={() => { if (!selected || !jobNote.trim()) return; const jobs = [...(db.jobs || [])]; const idx = jobs.findIndex((j: Job) => j.id === selected.id); if (idx >= 0) { jobs[idx] = { ...jobs[idx], notes: (jobs[idx].notes || '') + '\n' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) + ' — ' + jobNote }; saveData({ ...db, jobs }); setSelected({ ...jobs[idx] }); toast('הערה נוספה'); } setJobNote(''); }}
                    sx={{ minWidth: 'auto', px: 2, fontSize: 11 }}>+</Button>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Status actions */}
                {selected.status !== 'completed' && selected.status !== 'cancelled' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#78716C', mb: '2px' }}>⚡ פעולות</Typography>
                    {actions.map(a => (
                      <Button key={a.status} fullWidth onClick={() => changeStatus(selected, a.status)}
                        sx={{ justifyContent: 'flex-start', py: '10px', px: '12px', borderRadius: '10px', fontSize: 13, fontWeight: 600, bgcolor: a.color + '08', color: a.color, border: '1px solid ' + a.color + '18', gap: '8px' }}>
                        {a.icon} {a.label}
                      </Button>
                    ))}
                    <Button fullWidth onClick={() => { setClosePayment('cash'); setCloseNotes(''); setCloseMaterials(0); setCloseManualRevenue(itemsTotal || 0); setShowClose(true); }}
                      sx={{ justifyContent: 'flex-start', py: '10px', px: '12px', borderRadius: '10px', fontSize: 13, fontWeight: 700, bgcolor: '#05966908', color: '#059669', border: '1px solid #05966918', gap: '8px' }}>
                      ✅ סגור עבודה {itemsTotal > 0 ? '(' + formatCurrency(itemsTotal, currency) + ')' : ''}
                    </Button>
                  </Box>
                )}

                {/* Office call */}
                {cfg.biz_phone && <Button fullWidth href={'tel:' + cfg.biz_phone} sx={{ mt: 1.5, borderRadius: '10px', bgcolor: '#4F46E506', color: '#4F46E5', fontSize: 12, fontWeight: 600, py: 1 }}>📞 התקשר למשרד</Button>}
              </Box>)}

              {/* ═══ TAB: QUOTE ═══ */}
              {tab === 'quote' && (<Box>
                {/* Items list */}
                {items.map((item) => (
                  <Box key={item.id} sx={{ py: '10px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box onClick={() => addItemPhoto(item.id)} sx={{ width: 48, height: 48, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.06)', bgcolor: '#FAF7F4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CameraAlt sx={{ fontSize: 18, color: '#D4D0CC' }} />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{item.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', mt: '4px' }}>
                          <TextField size="small" type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)} sx={{ width: 40, '& input': { textAlign: 'center', fontSize: 11, p: '4px' } }} />
                          <Typography sx={{ fontSize: 10, color: '#A8A29E' }}>×</Typography>
                          <TextField size="small" type="number" value={item.price} onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} sx={{ width: 60, '& input': { textAlign: 'center', fontSize: 11, p: '4px' } }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#4F46E5' }}>{formatCurrency(item.price * item.qty, currency)}</Typography>
                        </Box>
                      </Box>
                      <IconButton size="small" onClick={() => removeItem(item.id)}><Delete sx={{ fontSize: 16, color: '#E11D48' }} /></IconButton>
                    </Box>
                  </Box>
                ))}

                {/* Total */}
                {items.length > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: '12px', borderBottom: '2px solid rgba(0,0,0,0.06)', mb: '14px' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800 }}>סה״כ</Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#4F46E5' }}>{formatCurrency(itemsTotal, currency)}</Typography>
                  </Box>
                )}

                {/* Add from catalog */}
                {products.length > 0 && (
                  <Box sx={{ mb: '12px' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '6px' }}>הוסף מהקטלוג</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {products.slice(0, 15).map((p: any) => (
                        <Chip key={p.id} label={p.name + ' ' + sym + p.price} size="small" onClick={() => addProduct(p)}
                          sx={{ fontSize: 10, cursor: 'pointer', '&:hover': { bgcolor: '#4F46E510' } }} icon={<Add sx={{ fontSize: 12 }} />} />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Custom item */}
                <Box sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', p: '10px', mb: '14px' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '6px' }}>➕ פריט מותאם אישית</Typography>
                  <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <TextField size="small" placeholder="שם" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} sx={{ flex: 1, '& input': { fontSize: 12, p: '7px 10px' } }} />
                    <TextField size="small" type="number" placeholder="כמות" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 1 })} sx={{ width: 48, '& input': { fontSize: 12, p: '7px', textAlign: 'center' } }} />
                    <TextField size="small" type="number" placeholder="מחיר" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })} sx={{ width: 65, '& input': { fontSize: 12, p: '7px', textAlign: 'center' } }} />
                    <Button size="small" variant="contained" onClick={addCustomItem} disabled={!newItem.name.trim()} sx={{ minWidth: 'auto', px: 1, fontSize: 16, borderRadius: '8px' }}>+</Button>
                  </Box>
                </Box>

                {/* Quote status */}
                {selected.quoteStatus && (
                  <Box sx={{ p: '10px 12px', borderRadius: '10px', mb: '10px', bgcolor: (QUOTE_STATUS[selected.quoteStatus]?.color || '#78716C') + '08', border: '1px solid ' + (QUOTE_STATUS[selected.quoteStatus]?.color || '#78716C') + '15' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: QUOTE_STATUS[selected.quoteStatus]?.color }}>
                      {QUOTE_STATUS[selected.quoteStatus]?.label}
                    </Typography>
                    {selected.quoteSentAt && <Typography sx={{ fontSize: 10, color: '#A8A29E', mt: '2px' }}>נשלח: {formatDate(selected.quoteSentAt)}</Typography>}
                  </Box>
                )}

                {/* Send options */}
                {items.length > 0 && selected.status !== 'completed' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#78716C', mb: '2px' }}>📤 שלח הצעת מחיר</Typography>
                    <Button fullWidth onClick={() => sendQuote('whatsapp')} sx={{ borderRadius: '10px', bgcolor: '#25D36610', color: '#25D366', fontWeight: 700, fontSize: 13, py: 1, justifyContent: 'flex-start', gap: '8px' }}>💬 שלח בוואטסאפ</Button>
                    <Button fullWidth onClick={() => sendQuote('sms')} sx={{ borderRadius: '10px', bgcolor: '#4F46E508', color: '#4F46E5', fontWeight: 600, fontSize: 12, py: 0.8, justifyContent: 'flex-start', gap: '8px' }}>📱 שלח ב-SMS</Button>
                    <Button fullWidth onClick={() => sendQuote('copy')} sx={{ borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.03)', color: '#78716C', fontWeight: 600, fontSize: 12, py: 0.8, justifyContent: 'flex-start', gap: '8px' }}>🔗 העתק קישור</Button>
                  </Box>
                )}
              </Box>)}
            </Box>
          </>);
        })()}
      </SwipeableDrawer>

      {/* WhatsApp prompt */}
      {waPrompt && (
        <Box sx={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 300, bgcolor: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', p: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '92vw', width: 340, direction: 'rtl' }}>
          <Box sx={{ fontSize: 20 }}>💬</Box>
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>שלח הודעה ללקוח?</Typography>
          <Button size="small" variant="contained" href={waPrompt.url} target="_blank" onClick={() => setWaPrompt(null)}
            sx={{ bgcolor: '#25D366', fontSize: 12, fontWeight: 700, borderRadius: '20px', px: 2, '&:hover': { bgcolor: '#1da851' } }}>שלח</Button>
          <Button size="small" onClick={() => setWaPrompt(null)} sx={{ fontSize: 11, minWidth: 'auto', color: '#A8A29E' }}>✕</Button>
        </Box>
      )}

      {/* Close job dialog */}
      <Dialog open={showClose} onClose={() => setShowClose(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px', direction: 'rtl' } }}>
        <Box sx={{ p: '20px 20px 0' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>סגור עבודה — {selected?.num}</Typography>
          {itemsTotal > 0 && <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#4F46E5', mt: '4px' }}>{formatCurrency(itemsTotal, currency)}</Typography>}
        </Box>
        <DialogContent>
          {items.length > 0 && (
            <Box sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', p: '10px', mb: 2, fontSize: 12 }}>
              {items.map(i => <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between', py: '3px' }}><span>{i.name} ×{i.qty}</span><strong>{formatCurrency(i.price * i.qty, currency)}</strong></Box>)}
            </Box>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', mb: 2 }}>
            <Box><Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>סכום הכנסה</Typography>
              <TextField fullWidth size="small" type="number" value={closeManualRevenue} onChange={e => setCloseManualRevenue(parseFloat(e.target.value) || 0)} /></Box>
            <Box><Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>עלות חומרים</Typography>
              <TextField fullWidth size="small" type="number" value={closeMaterials} onChange={e => setCloseMaterials(parseFloat(e.target.value) || 0)} /></Box>
          </Box>
          {closeManualRevenue > 0 && (
            <Box sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', p: '10px', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: '4px' }}><span style={{color:'#78716C'}}>הכנסה</span><strong style={{color:'#059669'}}>{formatCurrency(closeManualRevenue, currency)}</strong></Box>
              {closeMaterials > 0 && <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: '4px' }}><span style={{color:'#78716C'}}>חומרים</span><span style={{color:'#E11D48'}}>-{formatCurrency(closeMaterials, currency)}</span></Box>}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '6px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 15, fontWeight: 700 }}><span>רווח</span><span style={{color:'#4F46E5'}}>{formatCurrency(closeManualRevenue - closeMaterials, currency)}</span></Box>
            </Box>
          )}
          <Box sx={{ mb: 2 }}><Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>אמצעי תשלום</Typography>
            <Select fullWidth size="small" value={closePayment} onChange={(e: any) => setClosePayment(e.target.value)}>{PAYMENTS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}</Select></Box>
          <Box><Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>הערות</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="הערות סגירה..." /></Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setShowClose(false)}>ביטול</Button>
          <Button variant="contained" onClick={closeJob} sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>✅ סגור</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
