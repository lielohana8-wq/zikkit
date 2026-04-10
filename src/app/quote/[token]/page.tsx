'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { getFirestoreDb, doc, getDoc, setDoc } from '@/lib/firebase';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';

export default function QuotePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSign, setShowSign] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const db = getFirestoreDb();
        const snap = await getDoc(doc(db, 'public_portals', params.token));
        if (snap.exists()) {
          setData(snap.data());
          // Mark as viewed
          if (snap.data().quoteStatus === 'sent') {
            await setDoc(doc(db, 'public_portals', params.token), { quoteStatus: 'viewed', viewedAt: new Date().toISOString() }, { merge: true });
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [params.token]);

  const handleApprove = async (signature: string) => {
    try {
      const db2 = getFirestoreDb();
      await setDoc(doc(db2, 'public_portals', params.token), {
        quoteStatus: 'approved', signature, signedAt: new Date().toISOString(),
      }, { merge: true });
      setData({ ...data, quoteStatus: 'approved', signature });
      setShowSign(false);
    } catch (e) { console.error(e); }
  };

  const handleDecline = async () => {
    try {
      const db2 = getFirestoreDb();
      await setDoc(doc(db2, 'public_portals', params.token), {
        quoteStatus: 'declined', declineReason, declinedAt: new Date().toISOString(),
      }, { merge: true });
      setData({ ...data, quoteStatus: 'declined' });
      setDeclined(false);
    } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>טוען...</Typography></Box>;
  if (!data) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>הצעה לא נמצאה</Typography></Box>;

  const total = (data.items || []).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0);
  const isApproved = data.quoteStatus === 'approved';
  const isDeclined = data.quoteStatus === 'declined';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F0EB', py: 4, px: 2, direction: 'rtl' }}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <Box sx={{ bgcolor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <Box sx={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', p: '28px 24px', textAlign: 'center', position: 'relative' }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{(data.bizName || 'Z').charAt(0)}</Typography>
            </Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{data.bizName}</Typography>
            {data.bizPhone && <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', mt: '2px' }}>{data.bizPhone}</Typography>}
            <Box sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '8px', px: '10px', py: '3px' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>הצעת מחיר</Typography>
            </Box>
          </Box>

          {/* Quote number + date */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '16px 24px', bgcolor: '#FAFAF8', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <Box>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600 }}>מספר הצעה</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{data.num || '#' + data.jobId}</Typography>
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600 }}>תאריך</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{new Date(data.created || Date.now()).toLocaleDateString('he-IL')}</Typography>
            </Box>
          </Box>

          {/* Client */}
          <Box sx={{ p: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: '4px' }}>{data.client}</Typography>
            {data.address && <Typography sx={{ fontSize: 13, color: '#78716C' }}>📍 {data.address}</Typography>}
            {data.desc && <Typography sx={{ fontSize: 13, color: '#78716C', mt: '4px' }}>📝 {data.desc}</Typography>}
          </Box>

          {/* Items */}
          <Box sx={{ p: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600, mb: '8px', letterSpacing: '0.5px' }}>פירוט</Typography>
            {(data.items || []).map((item: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', py: '10px', borderBottom: i < (data.items || []).length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                {item.image && <img src={item.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{item.name}</Typography>
                  {item.qty > 1 && <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{item.qty} × {(item.price || 0).toLocaleString()}</Typography>}
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{((item.price || 0) * (item.qty || 1)).toLocaleString()} {data.currency === 'ILS' ? '₪' : '$'}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '12px', borderTop: '2px solid rgba(0,0,0,0.06)', mt: '8px' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800 }}>סה״כ</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>{total.toLocaleString()} {data.currency === 'ILS' ? '₪' : '$'}</Typography>
            </Box>
          </Box>

          {/* Status / Actions */}
          <Box sx={{ p: '20px 24px' }}>
            {isApproved && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', bgcolor: 'rgba(5,150,105,0.08)', borderRadius: '20px', px: '20px', py: '8px' }}>
                  <Typography sx={{ fontSize: 18 }}>✅</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>הצעה אושרה</Typography>
                </Box>
                {data.signature && (
                  <Box sx={{ mt: 2, border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', p: '12px', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 10, color: '#A8A29E', mb: '4px' }}>חתימת לקוח</Typography>
                    <img src={data.signature} alt="" style={{ maxWidth: 200, maxHeight: 70 }} />
                  </Box>
                )}
              </Box>
            )}

            {isDeclined && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', bgcolor: 'rgba(225,29,72,0.08)', borderRadius: '20px', px: '20px', py: '8px' }}>
                  <Typography sx={{ fontSize: 18 }}>❌</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#E11D48' }}>הצעה נדחתה</Typography>
                </Box>
              </Box>
            )}

            {!isApproved && !isDeclined && (
              <>
                {showSign ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, textAlign: 'center' }}>חתום לאישור ההצעה</Typography>
                    <SignatureCanvas onSave={handleApprove} onCancel={() => setShowSign(false)} />
                  </Box>
                ) : declined ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>סיבת סירוב (אופציונלי)</Typography>
                    <TextField fullWidth size="small" multiline rows={2} value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="למה לא מתאים..." sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button fullWidth onClick={() => setDeclined(false)} sx={{ borderRadius: '10px' }}>חזרה</Button>
                      <Button fullWidth variant="contained" onClick={handleDecline} sx={{ borderRadius: '10px', bgcolor: '#E11D48' }}>אשר סירוב</Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: '10px' }}>
                    <Button fullWidth variant="contained" onClick={() => setShowSign(true)}
                      sx={{ py: 1.5, borderRadius: '12px', fontSize: 15, fontWeight: 700 }}>
                      ✅ אשר הצעה
                    </Button>
                    <Button fullWidth onClick={() => setDeclined(true)}
                      sx={{ py: 1.5, borderRadius: '12px', fontSize: 15, fontWeight: 700, bgcolor: 'rgba(225,29,72,0.06)', color: '#E11D48' }}>
                      ❌ סרב
                    </Button>
                  </Box>
                )}
              </>
            )}

            <Typography sx={{ fontSize: 10, color: '#A8A29E', textAlign: 'center', mt: 2 }}>הצעה תקפה ל-30 יום</Typography>
          </Box>

          <Box sx={{ bgcolor: '#FAFAF8', p: '16px 24px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 10, color: '#D4D0CC' }}>Powered by Zikkit</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
