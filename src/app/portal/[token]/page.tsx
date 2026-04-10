'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';

const T = {
  he: {
    loading: 'טוען...', notFound: '🔗 קישור לא תקין', error: 'שגיאה בטעינה',
    progress: 'מעקב התקדמות', jobDetails: 'פרטי העבודה', photos: '📷 תמונות',
    items: '💰 פירוט', total: 'סה״כ', payment: '💳 תשלום', amount: 'סכום',
    payMethod: 'אמצעי תשלום', call: '📞 התקשר', whatsapp: '💬 וואטסאפ',
    client: 'לקוח', address: 'כתובת', date: 'מועד', tech: 'טכנאי', desc: 'תיאור',
    steps: ['פנייה התקבלה','טכנאי שובץ','נקבעה פגישה','טכנאי בדרך / בטיפול','עבודה הושלמה'],
    status: {
      open: { t: 'הפנייה שלך התקבלה', s: 'נחזור אליך בהקדם עם פרטי הטכנאי והמועד.' },
      assigned: { t: 'שובץ טכנאי לעבודה', s: 'ניצור איתך קשר לתיאום מועד.' },
      scheduled: { t: 'הפגישה נקבעה!', s: 'הטכנאי יגיע אליך במועד שנקבע.' },
      in_progress: { t: 'הטכנאי בדרך אליך!', s: 'הטכנאי יצא לכיוונך.' },
      waiting_parts: { t: 'ממתינים לחלקים', s: 'נדרשים חלקים נוספים. נעדכן ברגע שיגיעו.' },
      parts_arrived: { t: 'החלקים הגיעו!', s: 'נתאם איתך מועד להמשך.' },
      no_answer: { t: 'ניסינו ליצור קשר', s: 'לא הצלחנו להגיע אליך. אנא חזרו אלינו.' },
      callback: { t: 'נחזור אליך בקרוב', s: 'הצוות שלנו יצור איתך קשר.' },
      completed: { t: 'העבודה הושלמה!', s: 'תודה שבחרת בנו.' },
      cancelled: { t: 'העבודה בוטלה', s: '' },
    },
    pay: { cash: 'מזומן', credit_card: 'אשראי', check: "צ'ק", bank_transfer: 'העברה', bit: 'ביט', invoice: 'חשבונית' },
  },
  en: {
    loading: 'Loading...', notFound: '🔗 Invalid link', error: 'Error loading',
    progress: 'Progress', jobDetails: 'Job Details', photos: '📷 Photos',
    items: '💰 Details', total: 'Total', payment: '💳 Payment', amount: 'Amount',
    payMethod: 'Payment method', call: '📞 Call', whatsapp: '💬 WhatsApp',
    client: 'Client', address: 'Address', date: 'Date', tech: 'Technician', desc: 'Description',
    steps: ['Request received','Technician assigned','Appointment set','Technician on the way','Job completed'],
    status: {
      open: { t: 'Your request was received', s: 'We will get back to you shortly with technician details.' },
      assigned: { t: 'Technician assigned', s: 'We will contact you to schedule an appointment.' },
      scheduled: { t: 'Appointment confirmed!', s: 'The technician will arrive at the scheduled time.' },
      in_progress: { t: 'Technician is on the way!', s: 'The technician is heading to you now.' },
      waiting_parts: { t: 'Waiting for parts', s: 'Additional parts are needed. We will update you when they arrive.' },
      parts_arrived: { t: 'Parts arrived!', s: 'We will schedule a follow-up appointment.' },
      no_answer: { t: 'We tried reaching you', s: 'Please call us back at your convenience.' },
      callback: { t: 'We will call you back', s: 'Our team will contact you shortly.' },
      completed: { t: 'Job completed!', s: 'Thank you for choosing us.' },
      cancelled: { t: 'Job cancelled', s: '' },
    },
    pay: { cash: 'Cash', credit_card: 'Credit Card', check: 'Check', bank_transfer: 'Bank Transfer', bit: 'Bit', invoice: 'Invoice' },
  },
};

const STEP_ICONS = ['📋','👷','📅','🔧','✅'];
const STATUS_COLORS: Record<string, string> = {
  open: '#4F46E5', assigned: '#2563EB', scheduled: '#7C3AED', in_progress: '#D97706',
  waiting_parts: '#7C3AED', parts_arrived: '#059669', no_answer: '#E11D48',
  callback: '#D97706', completed: '#059669', cancelled: '#78716C',
};

function detectLang(): 'he' | 'en' {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const nav = navigator.language || '';
  if (tz === 'Asia/Jerusalem' || nav.startsWith('he') || nav.startsWith('iw')) return 'he';
  return 'en';
}

export default function PortalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'he' | 'en'>('he');

  useEffect(() => { setLang(detectLang()); }, []);

  useEffect(() => {
    let unsub: any = null;
    async function load() {
      try {
        const firebase = await import('@/lib/firebase');
        const db = firebase.getFirestoreDb();
        const docRef = firebase.doc(db, 'public_portals', params.token);
        try {
          unsub = firebase.onSnapshot(docRef, (snap: any) => {
            if (snap.exists()) { setData(snap.data()); setError(''); } else setError('not_found');
            setLoading(false);
          }, async () => {
            try { const snap = await firebase.getDoc(docRef); if (snap.exists()) { setData(snap.data()); } else setError('not_found'); } catch { setError('error'); }
            setLoading(false);
          });
        } catch {
          const snap = await firebase.getDoc(docRef);
          if (snap.exists()) { setData(snap.data()); } else setError('not_found');
          setLoading(false);
        }
      } catch { setError('error'); setLoading(false); }
    }
    load();
    return () => { if (unsub) unsub(); };
  }, [params.token]);

  const t = T[lang];
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>{t.loading}</Typography></Box>;
  if (error === 'not_found') return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>{t.notFound}</Typography></Box>;
  if (error || !data) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>{t.error}</Typography></Box>;

  let status = data.status || 'open';
  if (status === 'open' || status === 'assigned' || status === 'scheduled') {
    if (data.techName && data.scheduledDate) status = 'scheduled';
    else if (data.techName) status = 'assigned';
  }
  const color = STATUS_COLORS[status] || '#4F46E5';
  const statusInfo = (t.status as any)[status] || t.status.open;
  const activeStep = Math.max(0, ['open','assigned','scheduled','in_progress','completed'].indexOf(status));
  const photos = data.photos || [];
  const items = data.items || [];
  const sym = data.currency === 'ILS' ? '₪' : '$';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F0EB', direction: dir }}>
      {/* Lang toggle */}
      <Box sx={{ position: 'fixed', top: 12, [lang === 'he' ? 'left' : 'right']: 12, zIndex: 10 }}>
        <Button onClick={() => setLang(lang === 'he' ? 'en' : 'he')} size="small"
          sx={{ minWidth: 'auto', bgcolor: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)', borderRadius: '16px', px: 1.5, fontSize: 11, color: '#fff', fontWeight: 600 }}>
          {lang === 'he' ? 'EN' : 'עב'}
        </Button>
      </Box>

      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, p: '32px 24px 24px', textAlign: 'center' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{(data.bizName || 'Z').charAt(0)}</Typography>
        </Box>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{data.bizName || ''}</Typography>
        {data.bizPhone && <Button href={'tel:' + data.bizPhone} sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>📞 {data.bizPhone}</Button>}
      </Box>

      <Box sx={{ maxWidth: 500, mx: 'auto', p: '0 16px 32px', mt: '-16px' }}>
        {/* Status card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>{STEP_ICONS[activeStep] || '📋'}</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color, mb: '6px' }}>{statusInfo.t}</Typography>
          <Typography sx={{ fontSize: 14, color: '#78716C', lineHeight: 1.6 }}>{statusInfo.s}</Typography>
        </Box>

        {/* Timeline */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '14px' }}>{t.progress}</Typography>
          {t.steps.map((label, i) => {
            const done = i <= activeStep;
            const current = i === activeStep;
            return (
              <Box key={i} sx={{ display: 'flex', gap: '12px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: done ? color : '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', border: current ? '2px solid ' + color : 'none' }}>
                    {done ? <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</Typography> : <Typography sx={{ fontSize: 12 }}>{STEP_ICONS[i]}</Typography>}
                  </Box>
                  {i < t.steps.length - 1 && <Box sx={{ width: 2, height: 24, bgcolor: done ? color + '40' : '#E7E2DD', my: '2px' }} />}
                </Box>
                <Box sx={{ pt: '3px', pb: i < t.steps.length - 1 ? '12px' : '0' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: current ? 700 : 500, color: current ? color : done ? '#1C1917' : '#A8A29E' }}>{label}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Job details */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px' }}>{t.jobDetails}</Typography>
          {[
            data.client && { icon: '👤', label: t.client, value: data.client },
            data.address && { icon: '📍', label: t.address, value: data.address },
            data.scheduledDate && { icon: '📅', label: t.date, value: data.scheduledDate + ' ' + (data.scheduledTime || '') },
            data.techName && { icon: '👷', label: t.tech, value: data.techName },
            data.desc && { icon: '📝', label: t.desc, value: data.desc },
          ].filter(Boolean).map((item: any, i) => (
            <Box key={i} sx={{ display: 'flex', gap: '8px', py: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <Typography>{item.icon}</Typography>
              <Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>{item.label}</Typography><Typography sx={{ fontSize: 14, fontWeight: item.icon === '👤' || item.icon === '👷' ? 600 : 400 }}>{item.value}</Typography></Box>
            </Box>
          ))}
        </Box>

        {/* Photos */}
        {photos.length > 0 && (
          <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px' }}>{t.photos}</Typography>
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {photos.map((p: string, i: number) => (
                <Box key={i} sx={{ width: 80, height: 80, borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Items */}
        {items.length > 0 && (
          <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px' }}>{t.items}</Typography>
            {items.map((item: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', py: '10px', borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                {item.image && <img src={item.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />}
                <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 14 }}>{item.name}</Typography>{item.qty > 1 && <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>{item.qty} ×</Typography>}</Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{((item.price || 0) * (item.qty || 1)).toLocaleString()} {sym}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '12px', borderTop: '2px solid rgba(0,0,0,0.06)', mt: '4px' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{t.total}</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>{items.reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0).toLocaleString()} {sym}</Typography>
            </Box>
          </Box>
        )}

        {/* Payment */}
        {status === 'completed' && data.revenue && (
          <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
            <Box sx={{ bgcolor: '#05966908', borderRadius: '10px', p: '14px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>{t.amount}</span><strong>{(data.revenue || 0).toLocaleString()} {sym}</strong>
              </Box>
              {data.paymentMethod && <Typography sx={{ fontSize: 12, color: '#78716C', mt: '6px' }}>💳 {(t.pay as any)[data.paymentMethod] || data.paymentMethod}</Typography>}
            </Box>
          </Box>
        )}

        {/* Contact */}
        {data.bizPhone && (
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <Button fullWidth href={'tel:' + data.bizPhone} variant="contained" sx={{ borderRadius: '12px', py: 1.5, fontSize: 14, fontWeight: 700 }}>{t.call}</Button>
            <Button fullWidth href={'https://wa.me/' + (data.bizPhone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + data.bizPhone.replace(/[^0-9]/g, '').slice(1) : data.bizPhone.replace(/[^0-9]/g, ''))} target="_blank"
              sx={{ borderRadius: '12px', py: 1.5, fontSize: 14, fontWeight: 700, bgcolor: '#25D366', color: '#fff', '&:hover': { bgcolor: '#1da851' } }}>{t.whatsapp}</Button>
          </Box>
        )}

        <Typography sx={{ fontSize: 10, color: '#D4D0CC', textAlign: 'center', mt: 3 }}>Powered by Zikkit</Typography>
      </Box>
    </Box>
  );
}
