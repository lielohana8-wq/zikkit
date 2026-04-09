'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { getFirestoreDb, doc, getDoc, setDoc } from '@/lib/firebase';

const PAYMENT_LABELS: Record<string, string> = { cash: 'מזומן', credit_card: 'אשראי', check: "צ'ק", bank_transfer: 'העברה', bit: 'ביט', invoice: 'חשבונית' };

function SignaturePad({ onSave }: { onSave: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.scale(2, 2); ctx.strokeStyle = '#1C1917'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const start = (e: any) => { e.preventDefault(); setDrawing(true); setHasDrawn(true); const ctx = canvasRef.current?.getContext('2d'); const p = getPos(e); ctx?.beginPath(); ctx?.moveTo(p.x, p.y); };
  const move = (e: any) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext('2d'); const p = getPos(e); ctx?.lineTo(p.x, p.y); ctx?.stroke(); };
  const end = () => setDrawing(false);
  const clear = () => { const c = canvasRef.current; const ctx = c?.getContext('2d'); if (c && ctx) ctx.clearRect(0, 0, c.width, c.height); setHasDrawn(false); };

  return (
    <Box>
      <Box sx={{ border: '2px solid #E7E2DD', borderRadius: '12px', overflow: 'hidden', bgcolor: '#fff', mb: 1 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 120, touchAction: 'none', cursor: 'crosshair' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={clear} sx={{ fontSize: 12, color: '#A8A29E' }}>נקה</Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" onClick={() => { if (canvasRef.current) onSave(canvasRef.current.toDataURL('image/png')); }} disabled={!hasDrawn}
          sx={{ fontSize: 12, borderRadius: '20px', px: 3 }}>
          ✍️ אשר חתימה
        </Button>
      </Box>
    </Box>
  );
}

export default function QuotePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSign, setShowSign] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const db = getFirestoreDb();
        const snap = await getDoc(doc(db, 'public_portals', params.token));
        if (snap.exists()) { const d = snap.data(); setData(d); if (d.signature) setSigned(true); }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [params.token]);

  const handleSign = async (sigData: string) => {
    try {
      const db = getFirestoreDb();
      const update = {
        ...data,
        signature: sigData,
        signerName: signerName || data.client,
        signedAt: new Date().toISOString(),
        signerIP: '',
        status: 'signed',
      };
      await setDoc(doc(db, 'public_portals', params.token), update);
      setData(update);
      setSigned(true);
      setShowSign(false);
    } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>טוען...</Typography></Box>;
  if (!data) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F5F0EB' }}><Typography>הצעת מחיר לא נמצאה</Typography></Box>;

  const total = (data.items || []).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0);
  const cur = data.currency === 'ILS' ? '₪' : '$';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F0EB', py: 4, px: 2, direction: 'rtl' }}>
      <Box sx={{ maxWidth: 520, mx: 'auto' }}>
        <Box sx={{ bgcolor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <Box sx={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', p: '28px 24px', textAlign: 'center', position: 'relative' }}>
            {data.bizLogo ? (
              <img src={data.bizLogo} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', marginBottom: 8 }} />
            ) : (
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{(data.bizName || 'Z')[0]}</Typography>
              </Box>
            )}
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{data.bizName || 'Zikkit'}</Typography>
            {data.bizPhone && <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', mt: '2px' }}>{data.bizPhone}</Typography>}
            <Box sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '8px', px: '10px', py: '3px' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>הצעת מחיר</Typography>
            </Box>
            {signed && <Box sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(5,150,105,0.9)', borderRadius: '8px', px: '10px', py: '3px' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>✅ נחתם</Typography>
            </Box>}
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
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600 }}>תוקף</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>30 יום</Typography>
            </Box>
          </Box>

          {/* Client */}
          <Box sx={{ p: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600, mb: '6px', letterSpacing: '0.5px' }}>לכבוד</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: '4px' }}>{data.client}</Typography>
            {data.phone && <Typography sx={{ fontSize: 13, color: '#78716C' }}>📞 {data.phone}</Typography>}
            {data.address && <Typography sx={{ fontSize: 13, color: '#78716C' }}>📍 {data.address}</Typography>}
          </Box>

          {/* Job description */}
          {data.desc && (
            <Box sx={{ p: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600, mb: '4px' }}>תיאור העבודה</Typography>
              <Typography sx={{ fontSize: 13, color: '#57534E', lineHeight: 1.6 }}>{data.desc}</Typography>
            </Box>
          )}

          {/* Items */}
          {data.items && data.items.length > 0 && (
            <Box sx={{ p: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <Typography sx={{ fontSize: 10, color: '#A8A29E', fontWeight: 600, mb: '10px', letterSpacing: '0.5px' }}>פירוט</Typography>
              {data.items.map((item: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', py: '10px', borderBottom: i < data.items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  {item.image && <img src={item.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }} />}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{item.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{item.qty} × {(item.price || 0).toLocaleString()} {cur}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{((item.price || 0) * (item.qty || 1)).toLocaleString()} {cur}</Typography>
                </Box>
              ))}

              {/* Total */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '14px', mt: '6px', borderTop: '2px solid rgba(0,0,0,0.08)' }}>
                <Typography sx={{ fontSize: 18, fontWeight: 800 }}>סה״כ</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>{total.toLocaleString()} {cur}</Typography>
              </Box>
            </Box>
          )}

          {/* Signature area */}
          <Box sx={{ p: '20px 24px' }}>
            {signed || data.signature ? (
              <Box>
                <Box sx={{ bgcolor: 'rgba(5,150,105,0.06)', borderRadius: '12px', p: '16px', textAlign: 'center', mb: 2 }}>
                  <Typography sx={{ fontSize: 20, mb: '4px' }}>✅</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#059669', mb: '4px' }}>הצעה אושרה ונחתמה</Typography>
                  <Typography sx={{ fontSize: 11, color: '#78716C' }}>{data.signerName || data.client} · {data.signedAt ? new Date(data.signedAt).toLocaleDateString('he-IL') + ' ' + new Date(data.signedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}</Typography>
                </Box>
                {data.signature && (
                  <Box sx={{ bgcolor: '#FAFAF8', borderRadius: '10px', p: '12px', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 10, color: '#A8A29E', mb: '6px' }}>חתימה</Typography>
                    <img src={data.signature} alt="חתימה" style={{ maxWidth: 200, maxHeight: 80, margin: '0 auto', display: 'block' }} />
                  </Box>
                )}
              </Box>
            ) : showSign ? (
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '10px' }}>אישור וחתימה</Typography>
                <TextField fullWidth size="small" placeholder="שם מלא" value={signerName} onChange={e => setSignerName(e.target.value)}
                  sx={{ mb: 2, '& input': { fontSize: 14 } }} />
                <SignaturePad onSave={handleSign} />
                <Button fullWidth onClick={() => setShowSign(false)} sx={{ mt: 1, fontSize: 12, color: '#A8A29E' }}>ביטול</Button>
                <Typography sx={{ fontSize: 9, color: '#A8A29E', mt: 1, textAlign: 'center', lineHeight: 1.5 }}>
                  חתימה דיגיטלית זו מהווה אישור מחייב. שם החותם, תאריך ושעה נשמרים במערכת.
                </Typography>
              </Box>
            ) : (
              <Button fullWidth variant="contained" onClick={() => setShowSign(true)}
                sx={{ py: 1.5, fontSize: 16, fontWeight: 700, borderRadius: '12px', mb: 1 }}>
                ✍️ אשר וחתום על ההצעה
              </Button>
            )}

            {/* Print */}
            <Button fullWidth onClick={() => window.print()} sx={{ bgcolor: '#F5F0EB', color: '#78716C', borderRadius: '12px', py: '10px', fontSize: 13, fontWeight: 600, mt: 1 }}>
              🖨️ הדפס / שמור PDF
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ bgcolor: '#FAFAF8', p: '16px 24px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>תודה שבחרת ב-{data.bizName || 'Zikkit'}!</Typography>
            <Typography sx={{ fontSize: 9, color: '#D4D0CC', mt: '4px' }}>Powered by Zikkit</Typography>
          </Box>
        </Box>
      </Box>
      <style>{`@media print { body { background: #fff !important; } .MuiButton-root { display: none !important; } }`}</style>
    </Box>
  );
}
