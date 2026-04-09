'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, TextField, Switch, FormControlLabel, Chip, IconButton, Divider, Select, MenuItem, FormControl, InputLabel, Paper, Tabs, Tab, Avatar } from '@mui/material';
import { Send, Settings, Add, Edit, Campaign, Chat } from '@mui/icons-material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/formatters';

interface WATemplate { id: number; name: string; trigger: string; message: string; enabled: boolean; delay?: number }

const DEFAULT_TEMPLATES: WATemplate[] = [
  { id: 1, name: 'אישור תור', trigger: 'job_scheduled', message: 'שלום {customer_name}! התור שלך אושר ל-{date} בשעה {time}. הטכנאי {tech_name} יגיע אליך. לביטול השב "ביטול".', enabled: true },
  { id: 2, name: 'תזכורת יום לפני', trigger: 'reminder_24h', message: 'תזכורת: מחר {date} בשעה {time} יגיע אליך {tech_name}. לשינוי השב "שינוי".', enabled: true, delay: 1440 },
  { id: 3, name: 'הטכנאי בדרך', trigger: 'tech_en_route', message: '{tech_name} יצא אליך! זמן הגעה: {eta} דקות. מעקב: {tracking_link}', enabled: true },
  { id: 4, name: 'סיום עבודה + תשלום', trigger: 'job_completed', message: 'העבודה הושלמה! סכום: {amount}. תשלום: {payment_link}. נשמח לביקורת: {review_link}', enabled: true },
  { id: 5, name: 'סקר שביעות רצון', trigger: 'review_request', message: 'היי {customer_name}, איך היה השירות? דרגו 1-5 כוכבים ⭐', enabled: true, delay: 60 },
  { id: 6, name: 'הצעת מחיר', trigger: 'quote_sent', message: 'הצעת מחיר #{quote_num} נשלחה. סה"כ: {amount}. לצפייה: {quote_link}. לאישור השב "מאשר".', enabled: true },
];

export default function WhatsAppPage() {
  const { db, saveData } = useData();
  const { toast } = useToast();
  const [tab, setTab] = useState(0);
  const [templates, setTemplates] = useState<WATemplate[]>(db.waTemplates || DEFAULT_TEMPLATES);
  const [editTemplate, setEditTemplate] = useState<WATemplate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [botEnabled, setBotEnabled] = useState(true);
  const [autoReply, setAutoReply] = useState('שלום! תודה שפנית אלינו. נחזור בהקדם.');

  const stats = { sent: 1247, delivered: 1198, read: 987, replied: 342, booked: 89 };

  const handleSaveTemplate = async () => {
    if (!editTemplate) return;
    const list = [...templates];
    const idx = list.findIndex(t => t.id === editTemplate.id);
    if (idx >= 0) list[idx] = editTemplate;
    else list.push({ ...editTemplate, id: Math.max(0, ...list.map(t => t.id)) + 1 });
    setTemplates(list);
    await saveData({ ...db, waTemplates: list });
    setShowModal(false);
    toast('תבנית נשמרה');
  };

  const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', flex: 1, minWidth: 110 }}>
      <Typography variant="h4" fontWeight={900} sx={{ color, fontFamily: 'Rubik' }}>{value.toLocaleString()}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );

  return (
    <Box className="zk-fade-up">
      <PageTabs tabs={[{ label: 'בוט AI', href: '/aibot', icon: '🤖' }, { label: 'וואטסאפ', href: '/whatsapp', icon: '💬' }, { label: 'ביקורות', href: '/reviews', icon: '⭐' }]} />
      <SectionHeader title="וואטסאפ בוט" subtitle="שיחות ותבניות אוטומטיות" actions={
        <FormControlLabel control={<Switch checked={botEnabled} onChange={(e) => { setBotEnabled(e.target.checked); toast(e.target.checked ? 'בוט הופעל' : 'בוט כובה'); }} color="success" />} label={botEnabled ? 'פעיל' : 'כבוי'} />
      } />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Stat label="נשלחו" value={stats.sent} color="#3B82F6" />
        <Stat label="נקראו" value={stats.read} color="#10B981" />
        <Stat label="השיבו" value={stats.replied} color="#F59E0B" />
        <Stat label="הזמינו תור" value={stats.booked} color="#8B5CF6" />
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { fontSize: 12, fontWeight: 600 } }}>
        <Tab icon={<Campaign sx={{ fontSize: 16 }} />} label="תבניות" iconPosition="start" />
        <Tab icon={<Chat sx={{ fontSize: 16 }} />} label="שיחות" iconPosition="start" />
        <Tab icon={<Settings sx={{ fontSize: 16 }} />} label="הגדרות" iconPosition="start" />
      </Tabs>
      {tab === 0 && (<Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setEditTemplate({ id: 0, name: '', trigger: '', message: '', enabled: true }); setShowModal(true); }} sx={{ bgcolor: '#25D366' }}>תבנית חדשה</Button>
        </Box>
        {templates.map(t => (
          <Paper key={t.id} sx={{ p: 2, mb: 1.5, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)', borderRight: `4px solid ${t.enabled ? '#25D366' : '#78716C'}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography fontWeight={700} fontSize={13}>{t.name}</Typography>
              <Chip label={t.trigger} size="small" sx={{ fontSize: 10 }} />
              {t.delay ? <Chip label={`${t.delay} דק'`} size="small" sx={{ fontSize: 10, bgcolor: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }} /> : null}
              <Box sx={{ flex: 1 }} />
              <Switch checked={t.enabled} size="small" color="success" onChange={() => { const list = templates.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x); setTemplates(list); }} />
              <IconButton size="small" onClick={() => { setEditTemplate(t); setShowModal(true); }}><Edit sx={{ fontSize: 14 }} /></IconButton>
            </Box>
            <Box sx={{ bgcolor: 'rgba(37,211,102,0.05)', borderRadius: 2, p: 1.5, border: '1px solid rgba(37,211,102,0.15)' }}>
              <Typography variant="body2" sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{t.message}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>)}
      {tab === 1 && (<Box sx={{ textAlign: 'center', py: 8 }}><Typography fontSize={40}>💬</Typography><Typography fontWeight={700} sx={{ mt: 1 }}>שיחות וואטסאפ יופיעו כאן</Typography><Typography variant="body2" color="text.secondary">חבר את WhatsApp Business API להתחיל</Typography></Box>)}
      {tab === 2 && (<Box sx={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box><Typography fontWeight={700} fontSize={14} sx={{ mb: 1 }}>🤖 תגובה אוטומטית</Typography><TextField fullWidth multiline rows={3} value={autoReply} onChange={e => setAutoReply(e.target.value)} size="small" /></Box>
        <Box><Typography fontWeight={700} fontSize={14} sx={{ mb: 1 }}>🔗 WhatsApp Business API</Typography><TextField fullWidth size="small" placeholder="Phone ID" sx={{ mb: 1 }} /><TextField fullWidth size="small" placeholder="Access Token" type="password" /></Box>
        <Button variant="contained" sx={{ bgcolor: '#25D366', alignSelf: 'flex-start' }} onClick={() => toast('הגדרות נשמרו')}>שמור</Button>
      </Box>)}
      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editTemplate?.id ? 'עריכת תבנית' : 'תבנית חדשה'} footer={<><Button variant="outlined" size="small" onClick={() => setShowModal(false)}>ביטול</Button><Button variant="contained" size="small" onClick={handleSaveTemplate} sx={{ bgcolor: '#25D366' }}>שמור</Button></>}>
        {editTemplate && (<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="שם" value={editTemplate.name} onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })} fullWidth size="small" />
          <FormControl fullWidth size="small"><InputLabel>טריגר</InputLabel><Select value={editTemplate.trigger} label="טריגר" onChange={e => setEditTemplate({ ...editTemplate, trigger: e.target.value })}>
            {['job_scheduled','reminder_24h','tech_en_route','job_completed','review_request','quote_sent','payment_reminder'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select></FormControl>
          <TextField label="השהיה (דקות)" type="number" value={editTemplate.delay || 0} onChange={e => setEditTemplate({ ...editTemplate, delay: parseInt(e.target.value) || 0 })} size="small" />
          <TextField label="הודעה" multiline rows={4} value={editTemplate.message} onChange={e => setEditTemplate({ ...editTemplate, message: e.target.value })} fullWidth size="small" helperText="משתנים: {customer_name} {date} {time} {tech_name} {amount} {tracking_link} {review_link}" />
        </Box>)}
      </ModalBase>
    </Box>
  );
}
