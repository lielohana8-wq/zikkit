'use client';
import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Select, MenuItem } from '@mui/material';
import { getFirestoreDb, doc, setDoc } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

type PlanType = 'trial' | 'monthly' | 'yearly';

const PLAN_CONFIG: Record<PlanType, { label: string; color: string; duration: string; daysOrMonths: number }> = {
  trial: { label: '🆓 ניסיון חינם — 14 יום', color: '#5a7080', duration: '14 ימים', daysOrMonths: 14 },
  monthly: { label: '💳 חודשי — חודש אחד', color: '#4f8fff', duration: 'חודש', daysOrMonths: 30 },
  yearly: { label: '⭐ שנתי — שנה', color: '#4F46E5', duration: 'שנה', daysOrMonths: 365 },
};

function calcExpiry(plan: PlanType): string {
  const now = new Date();
  const days = PLAN_CONFIG[plan].daysOrMonths;
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdminAddClientPage() {
  const [form, setForm] = useState({
    biz_name: '', email: '', password: 'Zikkit2026!', biz_type: 'general', biz_phone: '', region: 'IL', plan: 'trial' as PlanType,
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const expiryDate = calcExpiry(form.plan);
  const planCfg = PLAN_CONFIG[form.plan];

  const handleCreate = async () => {
    if (!form.biz_name || !form.email) { setMsg('חסר שם עסק או אימייל'); setStatus('error'); return; }
    setStatus('saving');
    try {
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      const db = getFirestoreDb();
      const currency = form.region === 'IL' ? 'ILS' : 'USD';

      await setDoc(doc(db, 'businesses', uid), {
        cfg: {
          biz_name: form.biz_name, biz_type: form.biz_type, biz_phone: form.biz_phone,
          region: form.region, currency, biz_email: form.email,
          plan: form.plan === 'trial' ? 'trial' : 'business',
          planStatus: form.plan === 'trial' ? 'trial' : 'active',
          planType: form.plan,
          trialEnds: form.plan === 'trial' ? expiryDate : undefined,
          subscriptionEnds: form.plan !== 'trial' ? expiryDate : undefined,
          setup_done: false,
        },
        db: {
          jobs: [], leads: [], quotes: [], expenses: [], botLog: [],
          users: [{ id: 1, name: form.biz_name + ' Owner', email: form.email, role: 'owner', phone: form.biz_phone, commission: 0 }],
          products: [
            { id: 1, name: 'Service Call', category: 'service', unit: 'job', price: 89, cost: 0, desc: 'Diagnostic visit' },
            { id: 2, name: 'Labor (per hour)', category: 'labor', unit: 'hour', price: 85, cost: 0, desc: 'Hourly labor rate' },
          ],
        },
        ownerEmail: form.email,
        created: new Date().toISOString(),
      });

      await setDoc(doc(db, 'users', uid), {
        email: form.email.toLowerCase(), bizId: uid, role: 'owner', created: new Date().toISOString(),
      });

      setStatus('done');
      setMsg(`✅ לקוח נוצר בהצלחה!\nUID: ${uid}\nתוקף: ${formatDate(expiryDate)}`);
      setForm({ biz_name: '', email: '', password: 'Zikkit2026!', biz_type: 'general', biz_phone: '', region: 'IL', plan: 'trial' });
    } catch (e: unknown) {
      setStatus('error');
      setMsg('❌ ' + (e instanceof Error ? e.message : 'שגיאה'));
    }
  };

  const F = ({ label, k, type }: { label: string; k: string; type?: string }) => (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', mb: '4px' }}>{label}</Typography>
      <TextField fullWidth size="small" type={type || 'text'} value={(form as Record<string, string>)[k]} onChange={(e) => set(k, e.target.value)}
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } }} />
    </Box>
  );

  return (
    <Box dir="rtl">
      <Typography sx={{ fontSize: 22, fontWeight: 800, mb: 3 }}>➕ הוסף לקוח</Typography>
      <Card sx={{ maxWidth: 500 }}>
        <CardContent sx={{ p: 3 }}>
          {msg && (
            <Box sx={{
              bgcolor: status === 'done' ? 'rgba(0,229,176,0.08)' : 'rgba(239,68,68,0.08)',
              border: '1px solid ' + (status === 'done' ? 'rgba(0,229,176,0.2)' : 'rgba(239,68,68,0.2)'),
              borderRadius: '10px', p: '12px', mb: 2, whiteSpace: 'pre-line',
            }}>
              <Typography sx={{ fontSize: 12, color: status === 'done' ? '#4F46E5' : '#ef4444' }}>{msg}</Typography>
            </Box>
          )}
          <F label={"שם עסק"} k="biz_name" />
          <F label={"אימייל"} k="email" />
          <F label={"סיסמה ראשונית"} k="password" />
          <F label={"טלפון"} k="biz_phone" />

          {/* Plan Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', mb: '4px' }}>תוכנית</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(Object.entries(PLAN_CONFIG) as [PlanType, typeof PLAN_CONFIG.trial][]).map(([key, cfg]) => (
                <Box key={key} onClick={() => set('plan', key)} sx={{
                  p: '10px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                  bgcolor: form.plan === key ? 'rgba(0,229,176,0.06)' : '#FAF7F4',
                  border: '1px solid ' + (form.plan === key ? cfg.color + '55' : 'rgba(255,255,255,0.055)'),
                  '&:hover': { borderColor: cfg.color },
                }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: form.plan === key ? cfg.color : '#a8bcc8' }}>
                    {cfg.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Expiry Preview */}
          <Box sx={{ bgcolor: 'rgba(79,143,255,0.06)', border: '1px solid rgba(79,143,255,0.15)', borderRadius: '10px', p: '10px 14px', mb: 2 }}>
            <Typography sx={{ fontSize: 11, color: '#4f8fff' }}>
              📅 תוקף: <strong>{formatDate(expiryDate)}</strong> ({planCfg.duration} מיום הפתיחה)
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', mb: '4px' }}>סוג עסק</Typography>
            <Select fullWidth size="small" value={form.biz_type} onChange={(e) => set('biz_type', e.target.value)}
              sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 }}>
              <MenuItem value="general">כללי</MenuItem>
              <MenuItem value="hvac">❄️ מיזוג אוויר</MenuItem>
              <MenuItem value="plumbing">🔧 אינסטלציה</MenuItem>
              <MenuItem value="electrical">⚡ חשמל</MenuItem>
              <MenuItem value="locksmith">🔑 מנעולנות</MenuItem>
              <MenuItem value="cleaning">🧹 ניקיון</MenuItem>
              <MenuItem value="pest">🐛 הדברה</MenuItem>
              <MenuItem value="garage">🚗 דלתות מוסך</MenuItem>
            </Select>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#5a7080', textTransform: 'uppercase', mb: '4px' }}>אזור</Typography>
            <Select fullWidth size="small" value={form.region} onChange={(e) => set('region', e.target.value)}
              sx={{ bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 }}>
              <MenuItem value="IL">🇮🇱 ישראל</MenuItem>
              <MenuItem value="US">🇺🇸 ארה״ב</MenuItem>
            </Select>
          </Box>

          <Button fullWidth variant="contained" onClick={handleCreate} disabled={status === 'saving'}
            sx={{ p: '12px', fontSize: 14, fontWeight: 800, borderRadius: '10px' }}>
            {status === 'saving' ? '⏳ יוצר...' : '🚀 צור לקוח'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
