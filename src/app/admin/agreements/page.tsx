'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, TextField, Select, MenuItem } from '@mui/material';
import { getFirestoreDb, collection, getDocs, doc, setDoc, deleteDoc } from '@/lib/firebase';

interface Agreement {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  bizName: string;
  type: 'pilot' | 'investor';
  status: 'pending' | 'signed' | 'expired';
  created: string;
  signedAt?: string;
  signatureData?: string;
  notes?: string;
}

const C = { bg: '#07090b', surface: '#FAF7F4', surface2: '#FAF7F4', accent: '#4F46E5', blue: '#4f8fff', purple: '#a78bfa', hot: '#ff4d6d', green: '#22c55e', warm: '#f59e0b', text: '#e8f0f4', text2: '#a8bcc8', text3: '#5a7080', border: 'rgba(255,255,255,0.055)' };

function SignaturePad({ onSave, onCancel }: { onSave: (data: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stop = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <Box sx={{ bgcolor: C.surface, border: '1px solid ' + C.border, borderRadius: '14px', p: 3, mb: 3 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.text, mb: 2 }}>✍️ חתימה דיגיטלית</Typography>
      <canvas ref={canvasRef} width={500} height={150}
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
        style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, cursor: 'crosshair', display: 'block', width: '100%', height: 150, touchAction: 'none' }}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button onClick={clear} size="small" sx={{ fontSize: 11, color: C.text3 }}>🗑️ נקה</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onCancel} size="small" sx={{ fontSize: 11, color: C.text3 }}>ביטול</Button>
        <Button onClick={() => onSave(canvasRef.current?.toDataURL() || '')} variant="contained" size="small"
          sx={{ fontSize: 11, fontWeight: 700, bgcolor: C.accent, color: '#000', borderRadius: '8px' }}>💾 שמור חתימה</Button>
      </Box>
    </Box>
  );
}

export default function AdminAgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showSign, setShowSign] = useState<string | null>(null);
  const [form, setForm] = useState({ clientName: '', clientEmail: '', clientPhone: '', bizName: '', type: 'pilot' as const, notes: '' });

  const loadAgreements = useCallback(async () => {
    try {
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, 'agreements'));
      const items: Agreement[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Agreement));
      items.sort((a, b) => b.created.localeCompare(a.created));
      setAgreements(items);
    } catch (e) { console.error('Failed to load agreements:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAgreements(); }, [loadAgreements]);

  const handleCreate = async () => {
    if (!form.clientName.trim()) return;
    const db = getFirestoreDb();
    const id = 'agr_' + Date.now();
    const agr: Agreement = { id, ...form, status: 'pending', created: new Date().toISOString() };
    await setDoc(doc(db, 'agreements', id), agr);
    setAgreements([agr, ...agreements]);
    setShowNew(false);
    setForm({ clientName: '', clientEmail: '', clientPhone: '', bizName: '', type: 'pilot', notes: '' });
  };

  const handleSign = async (id: string, sigData: string) => {
    const db = getFirestoreDb();
    await setDoc(doc(db, 'agreements', id), { status: 'signed', signedAt: new Date().toISOString(), signatureData: sigData }, { merge: true });
    setAgreements(agreements.map((a) => a.id === id ? { ...a, status: 'signed', signedAt: new Date().toISOString(), signatureData: sigData } : a));
    setShowSign(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק הסכם זה?')) return;
    const db = getFirestoreDb();
    await deleteDoc(doc(db, 'agreements', id));
    setAgreements(agreements.filter((a) => a.id !== id));
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'ממתין', color: C.warm, bg: 'rgba(245,158,11,0.1)' },
      signed: { label: 'חתום ✓', color: C.green, bg: 'rgba(34,197,94,0.1)' },
      expired: { label: 'פג תוקף', color: C.hot, bg: 'rgba(255,77,109,0.1)' },
    };
    const c = map[s] || map.pending;
    return <Box sx={{ display: 'inline-block', px: 1.5, py: 0.3, borderRadius: '20px', fontSize: 10, fontWeight: 700, bgcolor: c.bg, color: c.color }}>{c.label}</Box>;
  };

  const inputSx = { '& .MuiInputBase-root': { bgcolor: '#0a0c10', borderRadius: '10px', fontSize: 13, color: C.text }, '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border } };

  return (
    <Box dir="rtl">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.text }}>📝 הסכמים</Typography>
          <Typography sx={{ fontSize: 12, color: C.text3 }}>ניהול הסכמי פיילוט ו-NDA למשקיעים</Typography>
        </Box>
        <Button onClick={() => setShowNew(!showNew)} variant="contained" sx={{ fontSize: 12, fontWeight: 700, borderRadius: '10px', px: 3, background: 'linear-gradient(135deg, #4F46E5, #00a882)', color: '#000' }}>
          + הסכם חדש
        </Button>
      </Box>

      {showNew && (
        <Box sx={{ bgcolor: C.surface, border: '1px solid ' + C.border, borderRadius: '14px', p: 3, mb: 3 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.accent, mb: 2 }}>✨ הסכם חדש</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label={"שם"} value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} sx={inputSx} size="small" />
            <TextField label={"שם העסק"} value={form.bizName} onChange={(e) => setForm({ ...form, bizName: e.target.value })} sx={inputSx} size="small" />
            <TextField label={"אימייל"} value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} sx={inputSx} size="small" />
            <TextField label={"טלפון"} value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} sx={inputSx} size="small" />
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'pilot' | 'investor' })} fullWidth size="small"
              sx={{ bgcolor: '#0a0c10', borderRadius: '10px', fontSize: 12, color: C.text, '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border } }}>
              <MenuItem value="pilot" sx={{ fontSize: 12 }}>🤝 פיילוט חינם</MenuItem>
              <MenuItem value="investor" sx={{ fontSize: 12 }}>💼 משקיע NDA</MenuItem>
            </Select>
            <TextField label={"הערות"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} sx={inputSx} size="small" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowNew(false)} size="small" sx={{ fontSize: 11, color: C.text3 }}>ביטול</Button>
            <Button onClick={handleCreate} variant="contained" size="small" sx={{ fontSize: 12, fontWeight: 700, bgcolor: C.accent, color: '#000', borderRadius: '8px', px: 3 }}>💾 צור</Button>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[{ l: 'סה"כ', v: agreements.length, c: C.blue }, { l: 'ממתינים', v: agreements.filter((a) => a.status === 'pending').length, c: C.warm }, { l: 'חתומים', v: agreements.filter((a) => a.status === 'signed').length, c: C.green }].map((s) => (
          <Box key={s.l} sx={{ bgcolor: C.surface, border: '1px solid ' + C.border, borderRadius: '12px', p: 2, flex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase' }}>{s.l}</Typography>
          </Box>
        ))}
      </Box>

      {showSign && <SignaturePad onSave={(data) => handleSign(showSign, data)} onCancel={() => setShowSign(null)} />}

      <Box sx={{ bgcolor: C.surface, border: '1px solid ' + C.border, borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead"><Box component="tr" sx={{ bgcolor: C.surface2 }}>
              {['שם', 'עסק', 'סוג', 'סטטוס', 'תאריך', 'חתימה', 'פעולות'].map((h) => (
                <Box component="th" key={h} sx={{ p: '10px 14px', fontSize: 10, fontWeight: 700, color: C.text3, textAlign: 'right', textTransform: 'uppercase' }}>{h}</Box>
              ))}
            </Box></Box>
            <Box component="tbody">
              {loading ? (
                <Box component="tr"><Box component="td" colSpan={7} sx={{ p: 4, textAlign: 'center', color: C.text3, fontSize: 12 }}>טוען...</Box></Box>
              ) : agreements.length === 0 ? (
                <Box component="tr"><Box component="td" colSpan={7} sx={{ p: 4, textAlign: 'center', color: C.text3, fontSize: 12 }}>📝 אין הסכמים עדיין</Box></Box>
              ) : agreements.map((a) => (
                <Box component="tr" key={a.id} sx={{ borderTop: '1px solid ' + C.border, '&:hover': { bgcolor: 'rgba(255,255,255,0.015)' } }}>
                  <Box component="td" sx={{ p: '10px 14px', fontSize: 12, color: C.text, fontWeight: 600 }}>{a.clientName}</Box>
                  <Box component="td" sx={{ p: '10px 14px', fontSize: 12, color: C.text2 }}>{a.bizName || '—'}</Box>
                  <Box component="td" sx={{ p: '10px 14px', fontSize: 11 }}>{a.type === 'pilot' ? '🤝 פיילוט' : '💼 NDA'}</Box>
                  <Box component="td" sx={{ p: '10px 14px' }}>{statusBadge(a.status)}</Box>
                  <Box component="td" sx={{ p: '10px 14px', fontSize: 11, color: C.text3 }}>{new Date(a.created).toLocaleDateString('he-IL')}</Box>
                  <Box component="td" sx={{ p: '10px 14px' }}>{a.signatureData ? <Box component="img" src={a.signatureData} sx={{ height: 30, borderRadius: '4px', border: '1px solid ' + C.border }} /> : '—'}</Box>
                  <Box component="td" sx={{ p: '10px 14px', display: 'flex', gap: 0.5 }}>
                    {a.status === 'pending' && <Button onClick={() => setShowSign(a.id)} size="small" sx={{ fontSize: 10, fontWeight: 700, color: C.accent, minWidth: 0 }}>✍️</Button>}
                    {a.clientEmail && <Button onClick={async () => {
                      try {
                        const res = await fetch('/api/agreement/send', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ to: a.clientEmail, clientName: a.clientName, type: a.type, bizName: 'Zikkit' }),
                        });
                        const data = await res.json();
                        if (data.success) alert('הסכם נשלח בהצלחה ל-' + a.clientEmail);
                        else alert('שגיאה: ' + (data.error || 'Failed'));
                      } catch { alert('שגיאת רשת'); }
                    }} size="small" sx={{ fontSize: 10, fontWeight: 700, color: '#4f8fff', minWidth: 0 }}>📧</Button>}
                    <Button onClick={() => handleDelete(a.id)} size="small" sx={{ fontSize: 10, color: C.hot, minWidth: 0 }}>🗑️</Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
