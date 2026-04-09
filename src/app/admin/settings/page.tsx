'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Alert } from '@mui/material';

const C = { sf: '#0f1318', ac: '#00e5b0', bl: '#4f8fff', tx: '#e8f0f4', t2: '#a8bcc8', t3: '#5a7080', border: 'rgba(255,255,255,0.055)', ok: '#22c55e', rd: '#ef4444' };

const KEY_CONFIG = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', desc: 'AI Voice Bot + Simulator. console.anthropic.com → API Keys', placeholder: 'sk-ant-...' },
  { key: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID', desc: 'twilio.com/console → Account Info', placeholder: 'AC...' },
  { key: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token', desc: 'twilio.com/console → Account Info', placeholder: 'Token...' },
  { key: 'TWILIO_PHONE_NUMBER', label: 'Twilio Phone Number', desc: 'twilio.com/console → Phone Numbers → Buy', placeholder: '+1234567890' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key', desc: 'resend.com/api-keys → Create. Required for sending quotes/receipts via email.', placeholder: 're_...' },
  { key: 'RESEND_FROM_EMAIL', label: 'Resend From Email', desc: 'resend.com/domains → Add domain. Default: onboarding@resend.dev', placeholder: 'noreply@yourdomain.com' },
  { key: 'NEXT_PUBLIC_BASE_URL', label: 'ngrok / Public URL', desc: 'ngrok http 3000 → paste URL. For test calls from localhost.', placeholder: 'https://abc123.ngrok-free.app' },
];

export default function AdminSettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testBizId, setTestBizId] = useState('');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/env')
      .then(r => r.json())
      .then(d => { setKeys(d.keys || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: values }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'מפתחות עודכנו. הרץ מחדש את השרת (npm run dev) כדי שהשינויים ייכנסו לתוקף.' });
        setValues({});
        // Refresh keys
        const r2 = await fetch('/api/admin/env');
        const d2 = await r2.json();
        setKeys(d2.keys || {});
      } else {
        setMsg({ type: 'error', text: data.message || 'שגיאה' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'שגיאת חיבור' });
    }
    setSaving(false);
  };

  if (loading) return <Box sx={{ p: 3, color: C.t3 }}>טוען...</Box>;

  return (
    <Box dir="rtl">
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.tx, mb: 1 }}>
        הגדרות מערכת
      </Typography>
      <Typography sx={{ fontSize: 13, color: C.t3, mb: 3 }}>
        ניהול מפתחות API — הגדרות אלו נשמרות בקובץ .env.local
      </Typography>

      {msg && (
        <Alert severity={msg.type} sx={{
          mb: 2, bgcolor: msg.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: '10px', fontSize: 12, color: msg.type === 'success' ? C.ok : C.rd,
        }}>
          {msg.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {KEY_CONFIG.map(cfg => {
          const current = keys[cfg.key] || '';
          const hasValue = current.length > 0;
          return (
            <Box key={cfg.key} sx={{ bgcolor: C.sf, border: `1px solid ${C.border}`, borderRadius: '12px', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.tx }}>{cfg.label}</Typography>
                <Box sx={{
                  fontSize: 10, fontWeight: 700, px: 1, py: 0.3, borderRadius: '6px',
                  bgcolor: hasValue ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: hasValue ? C.ok : C.rd, border: `1px solid ${hasValue ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {hasValue ? 'מוגדר' : 'לא מוגדר'}
                </Box>
              </Box>
              <Typography sx={{ fontSize: 11, color: C.t3, mb: 1 }}>{cfg.desc}</Typography>
              {hasValue && (
                <Typography sx={{ fontSize: 11, color: C.t2, mb: 1, fontFamily: 'monospace' }}>
                  ערך נוכחי: {current}
                </Typography>
              )}
              <TextField
                fullWidth size="small"
                placeholder={cfg.placeholder}
                value={values[cfg.key] || ''}
                onChange={(e) => setValues(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                sx={{ '& input': { fontFamily: 'monospace', fontSize: 12 } }}
              />
            </Box>
          );
        })}
      </Box>

      <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
        <Button
          variant="contained" size="small"
          onClick={handleSave}
          disabled={saving || Object.values(values).every(v => !v.trim())}
          sx={{ px: 3, py: 1, fontSize: 13, fontWeight: 700, borderRadius: '10px' }}
        >
          {saving ? 'שומר...' : 'שמור מפתחות'}
        </Button>
        <Typography sx={{ fontSize: 11, color: C.t3, alignSelf: 'center' }}>
          אחרי שמירה — הרץ מחדש npm run dev
        </Typography>
      </Box>

      <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(79,143,255,0.05)', border: '1px solid rgba(79,143,255,0.1)', borderRadius: '10px' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.bl, mb: 1 }}>איפה מקבלים מפתחות?</Typography>
        <Typography sx={{ fontSize: 11, color: C.t2, lineHeight: 1.8 }}>
          Anthropic API Key → console.anthropic.com → API Keys → Create Key<br />
          Twilio SID + Token → twilio.com/console → Account Info<br />
          Twilio Phone → twilio.com/console → Phone Numbers → Buy<br />
          Resend API Key → resend.com/api-keys → Create<br />
          Resend From Email → resend.com/domains → Add + verify your domain
        </Typography>
      </Box>

      {/* ══ Test Call Section ══ */}
      <Box sx={{ mt: 4, bgcolor: C.sf, border: '1px solid rgba(0,229,176,0.2)', borderRadius: '14px', p: 3 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.ac, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          📞 טסט שיחה קולית
        </Typography>
        <Typography sx={{ fontSize: 11, color: C.t3, mb: 2 }}>
          Twilio יתקשר למספר שלך ויחבר אותך לבוט AI. תוכל לשמוע איך הוא עונה ומנהל שיחה.
        </Typography>

        {callResult && (
          <Alert severity={callResult.ok ? 'success' : 'error'} sx={{
            mb: 2, bgcolor: callResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${callResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: '10px', fontSize: 12, color: callResult.ok ? C.ok : C.rd,
          }}>
            {callResult.msg}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', mb: '4px' }}>מספר טלפון שלך</Typography>
            <TextField
              fullWidth size="small"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder={"050-1234567 או +972501234567"}
              sx={{ '& input': { fontFamily: 'monospace', fontSize: 13 } }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', mb: '4px' }}>Business ID (אופציונלי)</Typography>
            <TextField
              fullWidth size="small"
              value={testBizId}
              onChange={(e) => setTestBizId(e.target.value)}
              placeholder={"UID של לקוח לטסט (ריק = ברכה כללית)"}
              sx={{ '& input': { fontFamily: 'monospace', fontSize: 13 } }}
            />
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={async () => {
            if (!testPhone.trim()) return;
            setCalling(true);
            setCallResult(null);
            try {
              const res = await fetch('/api/voice/test-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: testPhone, bizId: testBizId || undefined }),
              });
              const data = await res.json();
              if (data.success) {
                setCallResult({ ok: true, msg: `📞 מתקשר ל-${data.to}... תרים את הטלפון!` });
              } else {
                setCallResult({ ok: false, msg: data.error || 'שגיאה' });
              }
            } catch (e) {
              setCallResult({ ok: false, msg: 'שגיאת חיבור: ' + (e as Error).message });
            }
            setCalling(false);
          }}
          disabled={calling || !testPhone.trim()}
          sx={{
            px: 4, py: 1.5, fontSize: 14, fontWeight: 800, borderRadius: '12px',
            bgcolor: '#00e5b0', color: '#000',
            '&:hover': { bgcolor: '#00d1a0' },
            '&:disabled': { bgcolor: 'rgba(0,229,176,0.2)', color: '#5a7080' },
          }}
        >
          {calling ? '⏳ מתקשר...' : '📞 התקשר אליי עכשיו'}
        </Button>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: '10px' }}>
          <Typography sx={{ fontSize: 11, color: '#f59e0b', lineHeight: 1.7 }}>
            ⚠️ <strong>דרישות:</strong> צריך להיות מוגדרים TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, ו-TWILIO_PHONE_NUMBER למעלה.<br />
            ⚠️ <strong>ngrok:</strong> אם אתה על localhost, צריך להריץ <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>ngrok http 3000</code> בטרמינל נפרד כדי ש-Twilio יוכל לדבר עם השרת.<br />
            💡 <strong>עלות:</strong> ~$0.02 לשיחת טסט מהקרדיט של $15 שקיבלת ברישום.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
