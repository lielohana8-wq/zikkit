'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { getFirestoreDb, doc, getDoc } from '@/lib/firebase';

const PAYMENT_LABELS: Record<string, string> = { cash: 'מזומן', credit_card: 'כרטיס אשראי', check: "צ'ק", bank_transfer: 'העברה בנקאית', bit: 'ביט', invoice: 'חשבונית', other: 'אחר' };

export default function ReceiptPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const db = getFirestoreDb();
        const snap = await getDoc(doc(db, 'public_portals', params.token));
        if (snap.exists()) setData(snap.data());
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [params.token]);

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>טוען...</Typography></Box>;
  if (!data) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>קבלה לא נמצאה</Typography></Box>;

  const profit = (data.revenue || 0) - (data.materials || 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F0EB', py: 4, px: 2, direction: 'rtl' }}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        {/* Receipt card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          
          {/* Header with logo */}
          <Box sx={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', p: '28px 24px', textAlign: 'center', position: 'relative' }}>
            {data.bizLogo ? (
              <img src={data.bizLogo} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', marginBottom: 8 }} />
            ) : (
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>
                  {(data.bizName || 'Z').charAt(0)}
                </Typography>
              </Box>
            )}
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{data.bizName || 'Zikkit'}</Typography>
            {data.bizPhone && <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', mt: '2px' }}>{data.bizPhone}</Typography>}
            <Box sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '8px', px: '10px', py: '3px' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>קבלה</Typography>
            </Box>
          </Box>

          {/* Receipt number + date */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '16px 24px', bgcolor: '#FAFAF8', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <Box>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600 }}>מספר קבלה</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{data.num || '#' + data.jobId}</Typography>
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600 }}>תאריך</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{new Date(data.created || Date.now()).toLocaleDateString('he-IL')}</Typography>
            </Box>
          </Box>

          {/* Client info */}
          <Box sx={{ p: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600, mb: '6px', letterSpacing: '0.5px' }}>פרטי לקוח</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: '4px' }}>{data.client}</Typography>
            {data.phone && <Typography sx={{ fontSize: 13, color: '#78716C' }}>📞 {data.phone}</Typography>}
            {data.address && <Typography sx={{ fontSize: 13, color: '#78716C' }}>📍 {data.address}</Typography>}
          </Box>

          {/* Job details */}
          <Box sx={{ p: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600, mb: '6px', letterSpacing: '0.5px' }}>פרטי עבודה</Typography>
            {data.desc && <Typography sx={{ fontSize: 13, color: '#57534E', mb: '8px' }}>{data.desc}</Typography>}
            {data.scheduledDate && <Typography sx={{ fontSize: 12, color: '#78716C' }}>📅 {data.scheduledDate} {data.scheduledTime || ''}</Typography>}
            {data.techName && <Typography sx={{ fontSize: 12, color: '#78716C' }}>👷 טכנאי: {data.techName}</Typography>}
          </Box>

          {/* Items if any */}
          {data.items && data.items.length > 0 && (
            <Box sx={{ p: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600, mb: '8px', letterSpacing: '0.5px' }}>פירוט</Typography>
              {data.items.map((item: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: '6px', borderBottom: i < data.items.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
                  <Typography sx={{ fontSize: 13 }}>{item.name} {item.qty > 1 ? `×${item.qty}` : ''}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{((item.price || 0) * (item.qty || 1)).toLocaleString()} {data.currency === 'ILS' ? '₪' : '$'}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Totals */}
          <Box sx={{ p: '20px 24px' }}>
            <Box sx={{ bgcolor: '#FAFAF8', borderRadius: '12px', p: '16px', mb: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
                <Typography sx={{ fontSize: 14, color: '#78716C' }}>סכום</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{(data.revenue || 0).toLocaleString()} {data.currency === 'ILS' ? '₪' : '$'}</Typography>
              </Box>
              {data.materials > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
                  <Typography sx={{ fontSize: 14, color: '#78716C' }}>חומרים</Typography>
                  <Typography sx={{ fontSize: 14, color: '#E11D48' }}>-{(data.materials || 0).toLocaleString()} {data.currency === 'ILS' ? '₪' : '$'}</Typography>
                </Box>
              )}
              {data.paymentMethod && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '8px' }}>
                  <Typography sx={{ fontSize: 14, color: '#78716C' }}>אמצעי תשלום</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '10px', borderTop: '2px solid rgba(0,0,0,0.06)' }}>
                <Typography sx={{ fontSize: 18, fontWeight: 800 }}>סה״כ</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>{(data.revenue || 0).toLocaleString()} {data.currency === 'ILS' ? '₪' : '$'}</Typography>
              </Box>
            </Box>

            {/* Status badge */}
            <Box sx={{ textAlign: 'center', mb: '16px' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', bgcolor: 'rgba(5,150,105,0.08)', borderRadius: '20px', px: '16px', py: '6px' }}>
                <Typography sx={{ fontSize: 16 }}>✅</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>שולם</Typography>
              </Box>
            </Box>

            {/* Print button */}
            <Button fullWidth onClick={() => window.print()} sx={{ bgcolor: '#F5F0EB', color: '#78716C', borderRadius: '12px', py: '10px', fontSize: 13, fontWeight: 600 }}>
              🖨️ הדפס / שמור PDF
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ bgcolor: '#FAFAF8', p: '16px 24px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>תודה שבחרת ב-{data.bizName || 'Zikkit'}!</Typography>
            <Typography sx={{ fontSize: 10, color: '#D4D0CC', mt: '4px' }}>Powered by Zikkit</Typography>
          </Box>
        </Box>
      </Box>

      {/* Print styles */}
      <style>{`@media print { body { background: #fff !important; } .MuiButton-root { display: none !important; } }`}</style>
    </Box>
  );
}
