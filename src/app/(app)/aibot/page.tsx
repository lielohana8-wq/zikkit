'use client';
import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Select, MenuItem } from '@mui/material';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';

const STEPS_ANDROID = [
  { icon: '📱', text: 'פתח את אפליקציית הטלפון' },
  { icon: '⚙️', text: 'לחץ על ⋮ (שלוש נקודות) → הגדרות' },
  { icon: '📞', text: 'לחץ על "העברת שיחות" או "Call Forwarding"' },
  { icon: '🔄', text: 'לחץ על "כשלא עונים" או "When unanswered"' },
  { icon: '✏️', text: 'הכנס את המספר למטה ולחץ אישור' },
];

const STEPS_IPHONE = [
  { icon: '📱', text: 'פתח הגדרות → טלפון' },
  { icon: '📞', text: 'לחץ על "העברת שיחות" / "Call Forwarding"' },
  { icon: '🟢', text: 'הפעל את המתג' },
  { icon: '✏️', text: 'הכנס את המספר למטה' },
];

export default function AiBotPage() {
  const { cfg, saveCfg } = useData();
  const { toast } = useToast();
  const [greeting, setGreeting] = useState('');
  const [botPhone, setBotPhone] = useState('');
  const [testPhone, setTestPhone] = useState('+972');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState('');
  const [phonePlatform, setPhonePlatform] = useState<'android' | 'iphone'>('android');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setGreeting((cfg as any).bot_greeting || '');
    setBotPhone((cfg as any).bot_phone || '');
  }, [cfg]);

  const handleSave = async () => {
    await saveCfg({ ...cfg, bot_greeting: greeting, bot_phone: botPhone });
    toast('✅ הגדרות בוט נשמרו');
  };

  const handleTestCall = async () => {
    if (testPhone.length < 10) return;
    setTesting(true); setTestStatus('📞 מתקשר...');
    try {
      const res = await fetch('/api/test-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: testPhone }) });
      const data = await res.json();
      if (data.success) setTestStatus('✅ הטלפון שלך אמור לצלצל! תענה ותדבר עם דנה.');
      else setTestStatus('❌ ' + (data.error || 'שגיאה'));
    } catch { setTestStatus('❌ שגיאת רשת'); }
    setTesting(false);
  };

  const copyNumber = () => {
    navigator.clipboard?.writeText(botPhone || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <Box className="zk-fade-up">
      <Box sx={{ mb: '20px' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>🤖 בוט קולי AI — דנה</Typography>
        <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>המזכירה שעונה ללקוחות 24/7</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '14px' }}>
        {/* Left column */}
        <Box>
          {/* Status */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>📊</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>סטטוס</Typography>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: botPhone ? '#059669' : '#D97706' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: botPhone ? '#059669' : '#D97706' }}>{botPhone ? 'פעיל' : 'לא מוגדר'}</Typography>
              </Box>
            </Box>
            <Box sx={{ p: '16px 18px', fontSize: 12, color: '#78716C', lineHeight: 2 }}>
              <div>🏢 עסק: <strong>{cfg.biz_name || '—'}</strong></div>
              <div>🔧 סוג: <strong>{cfg.biz_type || '—'}</strong></div>
              <div>📞 מספר בוט: <strong dir="ltr">{botPhone || 'לא הוגדר'}</strong></div>
              <div>🌐 שפה: <strong>עברית + אנגלית (אוטומטי)</strong></div>
            </Box>
          </Box>

          {/* Settings */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>⚙️</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>הגדרות</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <Box sx={{ mb: '14px' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>מספר טלפון של הבוט</Typography>
                <TextField fullWidth size="small" value={botPhone} onChange={e => setBotPhone(e.target.value)} dir="ltr"
                  placeholder="+1XXXXXXXXXX (מספר Retell)" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 14 } }} />
                <Typography sx={{ fontSize: 10, color: '#A8A29E', mt: '4px' }}>המספר שקנית ב-Retell AI</Typography>
              </Box>
              <Box sx={{ mb: '14px' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>ברכת פתיחה (אופציונלי)</Typography>
                <TextField fullWidth size="small" multiline rows={2} value={greeting} onChange={e => setGreeting(e.target.value)}
                  placeholder={`היי שלום! הגעת ל-${cfg.biz_name || 'העסק'}. מה קרה?`}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } }} />
              </Box>
              <Button fullWidth variant="contained" onClick={handleSave} sx={{ borderRadius: '10px', py: 1, fontSize: 13, fontWeight: 700 }}>💾 שמור</Button>
            </Box>
          </Box>

          {/* Test */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>🧪</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>בדיקת שיחה</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <TextField fullWidth size="small" value={testPhone} onChange={e => setTestPhone(e.target.value)} dir="ltr"
                placeholder="+972501234567" sx={{ mb: '10px', '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 15 } }} />
              <Button fullWidth variant="contained" onClick={handleTestCall} disabled={testing}
                sx={{ borderRadius: '10px', py: 1, fontSize: 13, fontWeight: 700, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                {testing ? '⏳ מתקשר...' : '📞 דנה, תתקשרי אליי'}
              </Button>
              {testStatus && (
                <Box sx={{ mt: '10px', p: '10px', borderRadius: '8px', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  bgcolor: testStatus.includes('❌') ? '#FEF2F2' : '#ECFDF5', color: testStatus.includes('❌') ? '#DC2626' : '#059669' }}>
                  {testStatus}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Right column — Setup Guide */}
        <Box>
          {/* How to connect */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>📲</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>חיבור לטלפון שלך — 2 דקות</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <Typography sx={{ fontSize: 13, color: '#57534E', lineHeight: 1.8, mb: '12px' }}>
                הלקוחות ממשיכים להתקשר <strong>למספר הרגיל שלך</strong>. כשאתה לא עונה — השיחה מועברת אוטומטית לדנה.
              </Typography>

              {/* Phone number to copy */}
              {botPhone && (
                <Box sx={{ bgcolor: '#F5F0EB', borderRadius: '10px', p: '12px', mb: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ fontSize: 10, color: '#A8A29E' }}>מספר להעברה:</Typography>
                    <Typography dir="ltr" sx={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{botPhone}</Typography>
                  </Box>
                  <Button size="small" onClick={copyNumber} sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, bgcolor: copied ? '#05966915' : '#4F46E510', color: copied ? '#059669' : '#4F46E5' }}>
                    {copied ? '✅ הועתק!' : '📋 העתק'}
                  </Button>
                </Box>
              )}

              {/* Platform selector */}
              <Box sx={{ display: 'flex', gap: '8px', mb: '14px' }}>
                <Button onClick={() => setPhonePlatform('android')} fullWidth
                  sx={{ borderRadius: '8px', py: 1, fontSize: 13, fontWeight: 600,
                    bgcolor: phonePlatform === 'android' ? '#059669' : '#FAF7F4', color: phonePlatform === 'android' ? '#fff' : '#78716C' }}>
                  🤖 אנדרואיד
                </Button>
                <Button onClick={() => setPhonePlatform('iphone')} fullWidth
                  sx={{ borderRadius: '8px', py: 1, fontSize: 13, fontWeight: 600,
                    bgcolor: phonePlatform === 'iphone' ? '#059669' : '#FAF7F4', color: phonePlatform === 'iphone' ? '#fff' : '#78716C' }}>
                  🍎 אייפון
                </Button>
              </Box>

              {/* Steps */}
              {(phonePlatform === 'android' ? STEPS_ANDROID : STEPS_IPHONE).map((step, i) => (
                <Box key={i} sx={{ display: 'flex', gap: '10px', py: '8px', borderBottom: i < (phonePlatform === 'android' ? STEPS_ANDROID : STEPS_IPHONE).length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#4F46E510', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{step.icon}</Box>
                  <Box sx={{ pt: '4px' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#57534E' }}><strong>{i + 1}.</strong> {step.text}</Typography>
                  </Box>
                </Box>
              ))}

              <Box sx={{ bgcolor: '#ECFDF5', borderRadius: '8px', p: '10px', mt: '12px', fontSize: 12, color: '#065F46', lineHeight: 1.7 }}>
                ✅ <strong>זהו!</strong> עכשיו כשאתה עסוק — דנה עונה. הלקוחות מתקשרים למספר הרגיל שלך, כלום לא משתנה מבחינתם.
              </Box>

              {/* Alternative */}
              <Typography sx={{ fontSize: 11, color: '#A8A29E', mt: '12px', lineHeight: 1.7 }}>
                💡 <strong>אפשרות נוספת:</strong> תתקשר לספק (פרטנר/סלקום/הוט) ותבקש "הפניית שיחות כשלא עונים למספר {botPhone}"
              </Typography>
            </Box>
          </Box>

          {/* What Dana does */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>💡</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>מה דנה עושה?</Typography>
            </Box>
            <Box sx={{ p: '16px 18px', fontSize: 12, color: '#78716C', lineHeight: 2.2 }}>
              <div>✅ עונה ללקוחות 24/7 בעברית ואנגלית</div>
              <div>✅ שואלת שאלות חכמות לפי סוג הבעיה</div>
              <div>✅ אוספת שם, טלפון, כתובת, תיאור</div>
              <div>✅ משכנעת לקוחות מהססים</div>
              <div>✅ מטפלת בתלונות ובקשות למנהל</div>
              <div>✅ מציעה מבצעים ואחריות</div>
              <div>✅ פותחת ליד אוטומטית במערכת</div>
              <div>✅ שולחת ללקוח לינק לפורטל מעקב</div>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
