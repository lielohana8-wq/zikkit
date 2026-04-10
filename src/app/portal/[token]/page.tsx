'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';

const STATUS_STEPS = [
  { key: 'open', label: 'פנייה התקבלה', icon: '📋' },
  { key: 'assigned', label: 'טכנאי שובץ', icon: '👷' },
  { key: 'scheduled', label: 'נקבעה פגישה', icon: '📅' },
  { key: 'in_progress', label: 'טכנאי בדרך / בטיפול', icon: '🔧' },
  { key: 'completed', label: 'עבודה הושלמה', icon: '✅' },
];

const STATUS_MSG: Record<string, { title: string; sub: string; color: string }> = {
  open: { title: 'הפנייה שלך התקבלה', sub: 'נחזור אליך בהקדם עם פרטי הטכנאי והמועד.', color: '#4F46E5' },
  assigned: { title: 'שובץ טכנאי לעבודה', sub: 'ניצור איתך קשר לתיאום מועד.', color: '#2563EB' },
  scheduled: { title: 'הפגישה נקבעה!', sub: 'הטכנאי יגיע אליך במועד שנקבע.', color: '#7C3AED' },
  in_progress: { title: 'הטכנאי בדרך אליך!', sub: 'הטכנאי יצא לכיוונך.', color: '#D97706' },
  waiting_parts: { title: 'ממתינים לחלקים', sub: 'נדרשים חלקים נוספים. נעדכן ברגע שיגיעו.', color: '#7C3AED' },
  parts_arrived: { title: 'החלקים הגיעו!', sub: 'נתאם איתך מועד להמשך.', color: '#059669' },
  no_answer: { title: 'ניסינו ליצור קשר', sub: 'לא הצלחנו להגיע אליך. אנא חזרו אלינו.', color: '#E11D48' },
  callback: { title: 'נחזור אליך בקרוב', sub: 'הצוות שלנו יצור איתך קשר.', color: '#D97706' },
  completed: { title: 'העבודה הושלמה!', sub: 'תודה שבחרת בנו.', color: '#059669' },
  cancelled: { title: 'העבודה בוטלה', sub: '', color: '#78716C' },
};

const PAY: Record<string, string> = { cash: 'מזומן', credit_card: 'אשראי', check: "צ'ק", bank_transfer: 'העברה', bit: 'ביט', invoice: 'חשבונית' };

export default function PortalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsub: any = null;
    async function load() {
      try {
        const firebase = await import('@/lib/firebase');
        const db = firebase.getFirestoreDb();
        const docRef = firebase.doc(db, 'public_portals', params.token);
        
        // Try real-time listener first
        try {
          unsub = firebase.onSnapshot(docRef, (snap: any) => {
            if (snap.exists()) { setData(snap.data()); setError(''); }
            else setError('not_found');
            setLoading(false);
          }, async () => {
            // Fallback to getDoc if onSnapshot fails
            try {
              const snap = await firebase.getDoc(docRef);
              if (snap.exists()) { setData(snap.data()); setError(''); }
              else setError('not_found');
            } catch (e2) { setError('error'); }
            setLoading(false);
          });
        } catch {
          // Fallback
          const snap = await firebase.getDoc(docRef);
          if (snap.exists()) { setData(snap.data()); setError(''); }
          else setError('not_found');
          setLoading(false);
        }
      } catch (e) {
        console.error('[Portal]', e);
        setError('error');
        setLoading(false);
      }
    }
    load();
    return () => { if (unsub) unsub(); };
  }, [params.token]);

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>טוען...</Typography></Box>;
  if (error === 'not_found') return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>🔗 קישור לא תקין</Typography></Box>;
  if (error || !data) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>שגיאה בטעינה</Typography></Box>;

  const status = data.status || 'open';
  const info = STATUS_MSG[status] || STATUS_MSG.open;
  const activeStep = STATUS_STEPS.findIndex(s => s.key === status);
  const photos = data.photos || [];
  const items = data.items || [];
  const sym = data.currency === 'ILS' ? '₪' : '$';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F0EB', direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`, p: '32px 24px 24px', textAlign: 'center' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{(data.bizName || 'Z').charAt(0)}</Typography>
        </Box>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{data.bizName || ''}</Typography>
        {data.bizPhone && <Button href={'tel:' + data.bizPhone} sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>📞 {data.bizPhone}</Button>}
      </Box>

      <Box sx={{ maxWidth: 500, mx: 'auto', p: '0 16px 32px', mt: '-16px' }}>
        {/* Status */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>{STATUS_STEPS.find(s => s.key === status)?.icon || '📋'}</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: info.color, mb: '6px' }}>{info.title}</Typography>
          <Typography sx={{ fontSize: 14, color: '#78716C', lineHeight: 1.6 }}>{info.sub}</Typography>
        </Box>

        {/* Timeline */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '14px' }}>מעקב התקדמות</Typography>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= (activeStep >= 0 ? activeStep : 0);
            const current = i === (activeStep >= 0 ? activeStep : 0);
            return (
              <Box key={step.key} sx={{ display: 'flex', gap: '12px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: done ? info.color : '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', border: current ? '2px solid ' + info.color : 'none' }}>
                    {done ? <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</Typography> : <Typography sx={{ fontSize: 12 }}>{step.icon}</Typography>}
                  </Box>
                  {i < STATUS_STEPS.length - 1 && <Box sx={{ width: 2, height: 24, bgcolor: done ? info.color + '40' : '#E7E2DD', my: '2px' }} />}
                </Box>
                <Box sx={{ pt: '3px', pb: i < STATUS_STEPS.length - 1 ? '12px' : '0' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: current ? 700 : 500, color: current ? info.color : done ? '#1C1917' : '#A8A29E' }}>{step.label}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Job details */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px' }}>פרטי העבודה</Typography>
          {data.client && <Box sx={{ display: 'flex', gap: '8px', py: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}><Typography>👤</Typography><Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>לקוח</Typography><Typography sx={{ fontSize: 14, fontWeight: 600 }}>{data.client}</Typography></Box></Box>}
          {data.address && <Box sx={{ display: 'flex', gap: '8px', py: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}><Typography>📍</Typography><Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>כתובת</Typography><Typography sx={{ fontSize: 14 }}>{data.address}</Typography></Box></Box>}
          {data.scheduledDate && <Box sx={{ display: 'flex', gap: '8px', py: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}><Typography>📅</Typography><Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>מועד</Typography><Typography sx={{ fontSize: 14 }}>{data.scheduledDate} {data.scheduledTime || ''}</Typography></Box></Box>}
          {data.techName && <Box sx={{ display: 'flex', gap: '8px', py: '8px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}><Typography>👷</Typography><Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>טכנאי</Typography><Typography sx={{ fontSize: 14, fontWeight: 600 }}>{data.techName}</Typography></Box></Box>}
          {data.desc && <Box sx={{ display: 'flex', gap: '8px', py: '8px' }}><Typography>📝</Typography><Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>תיאור</Typography><Typography sx={{ fontSize: 14, color: '#57534E' }}>{data.desc}</Typography></Box></Box>}
        </Box>

        {/* Photos */}
        {photos.length > 0 && (
          <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px' }}>📷 תמונות</Typography>
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
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', mb: '10px' }}>💰 פירוט</Typography>
            {items.map((item: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', py: '10px', borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                {item.image && <img src={item.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />}
                <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 14 }}>{item.name}</Typography>{item.qty > 1 && <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>{item.qty} ×</Typography>}</Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{((item.price || 0) * (item.qty || 1)).toLocaleString()} {sym}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '12px', borderTop: '2px solid rgba(0,0,0,0.06)', mt: '4px' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800 }}>סה״כ</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>{items.reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0).toLocaleString()} {sym}</Typography>
            </Box>
          </Box>
        )}

        {/* Payment if completed */}
        {status === 'completed' && data.revenue && (
          <Box sx={{ bgcolor: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 2 }}>
            <Box sx={{ bgcolor: '#05966908', borderRadius: '10px', p: '14px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>סכום</span><strong>{(data.revenue || 0).toLocaleString()} {sym}</strong>
              </Box>
              {data.paymentMethod && <Typography sx={{ fontSize: 12, color: '#78716C', mt: '6px' }}>💳 {PAY[data.paymentMethod] || data.paymentMethod}</Typography>}
            </Box>
          </Box>
        )}

        {/* Contact */}
        {data.bizPhone && (
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <Button fullWidth href={'tel:' + data.bizPhone} variant="contained" sx={{ borderRadius: '12px', py: 1.5, fontSize: 14, fontWeight: 700 }}>📞 התקשר</Button>
            <Button fullWidth href={'https://wa.me/' + (data.bizPhone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + data.bizPhone.replace(/[^0-9]/g, '').slice(1) : data.bizPhone.replace(/[^0-9]/g, ''))} target="_blank"
              sx={{ borderRadius: '12px', py: 1.5, fontSize: 14, fontWeight: 700, bgcolor: '#25D366', color: '#fff', '&:hover': { bgcolor: '#1da851' } }}>💬 וואטסאפ</Button>
          </Box>
        )}

        <Typography sx={{ fontSize: 10, color: '#D4D0CC', textAlign: 'center', mt: 3 }}>Powered by Zikkit</Typography>
      </Box>
    </Box>
  );
}
