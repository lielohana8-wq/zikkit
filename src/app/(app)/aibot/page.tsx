'use client';
import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/hooks/useToast';

const STEPS_ANDROID = [
  { icon: '📱', text: 'פתח את אפליקציית הטלפון' },
  { icon: '⚙️', text: 'לחץ ⋮ (שלוש נקודות) → הגדרות' },
  { icon: '📞', text: 'לחץ "העברת שיחות" / "Call Forwarding"' },
  { icon: '🔄', text: 'לחץ "כשלא עונים" / "When unanswered"' },
  { icon: '✏️', text: 'הכנס את המספר למעלה ואשר' },
];

const STEPS_IPHONE = [
  { icon: '📱', text: 'פתח הגדרות → טלפון' },
  { icon: '📞', text: 'לחץ "העברת שיחות" / "Call Forwarding"' },
  { icon: '🟢', text: 'הפעל את המתג' },
  { icon: '✏️', text: 'הכנס את המספר למעלה' },
];

export default function AiBotPage() {
  const { cfg, saveCfg } = useData();
  const { bizId } = useAuth();
  const { toast } = useToast();
  const [activating, setActivating] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [testPhone, setTestPhone] = useState('+972');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState('');
  const [platform, setPlatform] = useState<'android' | 'iphone'>('android');
  const [copied, setCopied] = useState(false);

  const botPhone = (cfg as any).bot_phone || '';
  const botActive = (cfg as any).bot_active || false;

  useEffect(() => { setGreeting((cfg as any).bot_greeting || ''); }, [cfg]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await fetch('/api/bot-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bizId, bizName: cfg.biz_name || '', bizType: cfg.biz_type || '',
          greeting: greeting || `היי שלום! הגעת ל-${cfg.biz_name || 'העסק'}. מה קרה? ספר לי.`,
          bizPhone: cfg.biz_phone || '',
        }),
      });
      const data = await res.json();
      if (data.success && data.phoneNumber) {
        await saveCfg({ ...cfg, bot_active: true, bot_phone: data.phoneNumber, retell_agent_id: data.agentId, bot_greeting: greeting });
        toast('✅ הבוט הופעל! המספר שלך מוכן.');
      } else {
        toast('❌ ' + (data.error || 'שגיאה בהפעלה'), '#E11D48');
      }
    } catch { toast('❌ שגיאת רשת'); }
    setActivating(false);
  };

  const handleSaveGreeting = async () => {
    await saveCfg({ ...cfg, bot_greeting: greeting });
    toast('✅ ברכה עודכנה');
  };

  const handleTestCall = async () => {
    if (testPhone.length < 10) return;
    setTesting(true); setTestStatus('📞 דנה מתקשרת אליך...');
    try {
      const res = await fetch('/api/test-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: testPhone }) });
      const data = await res.json();
      if (data.success) setTestStatus('✅ הטלפון שלך אמור לצלצל! תענה ותדבר עם דנה.');
      else setTestStatus('❌ ' + (data.error || 'שגיאה'));
    } catch { setTestStatus('❌ שגיאת רשת'); }
    setTesting(false);
  };

  const copyNumber = () => {
    navigator.clipboard?.writeText(botPhone).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // Not activated yet
  if (!botActive || !botPhone) {
    return (
      <Box className="zk-fade-up">
        <Box sx={{ mb: '20px' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>🤖 בוט קולי AI — דנה</Typography>
          <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>המזכירה שעונה ללקוחות 24/7</Typography>
        </Box>

        <Box sx={{ maxWidth: 500, mx: 'auto', textAlign: 'center' }}>
          <Box sx={{ bgcolor: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', p: '40px 30px', mb: '14px' }}>
            <Typography sx={{ fontSize: 60, mb: 2 }}>🤖📞</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, mb: '8px' }}>הפעל את דנה — המזכירה שלך</Typography>
            <Typography sx={{ fontSize: 13, color: '#78716C', lineHeight: 1.8, mb: 3 }}>
              דנה עונה לכל שיחה שאתה לא עונה.<br />
              אוספת פרטים, משכנעת לקוחות, פותחת עבודות.<br />
              24/7, בעברית ואנגלית. כמו מזכירה אמיתית.
            </Typography>

            <Box sx={{ bgcolor: '#F5F0EB', borderRadius: '12px', p: '16px', mb: 3, textAlign: 'right' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '6px' }}>ברכה מותאמת (אופציונלי)</Typography>
              <TextField fullWidth size="small" multiline rows={2} value={greeting} onChange={e => setGreeting(e.target.value)}
                placeholder={`היי שלום! הגעת ל-${cfg.biz_name || 'העסק'}. מה קרה? ספר לי.`}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '10px', fontSize: 13 } }} />
            </Box>

            <Button fullWidth variant="contained" onClick={handleActivate} disabled={activating}
              sx={{ borderRadius: '12px', py: 1.5, fontSize: 16, fontWeight: 800, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
              {activating ? '⏳ מפעיל...' : '🚀 הפעל את דנה — חינם לתקופת הנסיון'}
            </Button>

            <Box sx={{ mt: 2, fontSize: 11, color: '#A8A29E', lineHeight: 1.8 }}>
              ✅ לא צריך לשנות את המספר שלך<br />
              ✅ הלקוחות ממשיכים להתקשר כרגיל<br />
              ✅ הגדרה ב-2 דקות
            </Box>
          </Box>

          {/* What Dana does */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', p: '20px', textAlign: 'right' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '10px' }}>💡 מה דנה עושה?</Typography>
            <Box sx={{ fontSize: 12, color: '#78716C', lineHeight: 2.2 }}>
              <div>✅ עונה ללקוחות כשאתה עסוק — 24/7</div>
              <div>✅ מדברת עברית ואנגלית בטבעיות</div>
              <div>✅ שואלת שאלות חכמות על הבעיה</div>
              <div>✅ אוספת שם, טלפון, כתובת</div>
              <div>✅ משכנעת לקוחות מהססים</div>
              <div>✅ מטפלת בתלונות ובקשות</div>
              <div>✅ פותחת ליד אוטומטי במערכת</div>
              <div>✅ שולחת ללקוח לינק לפורטל מעקב</div>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Activated
  return (
    <Box className="zk-fade-up">
      <Box sx={{ mb: '20px' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>🤖 בוט קולי AI — דנה</Typography>
        <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>המזכירה שעונה ללקוחות 24/7</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '14px' }}>
        {/* Left */}
        <Box>
          {/* Status */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>📊</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>סטטוס</Typography>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#059669' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>פעיל ✅</Typography>
              </Box>
            </Box>
            <Box sx={{ p: '16px 18px', fontSize: 13, color: '#78716C', lineHeight: 2 }}>
              <div>🏢 <strong>{cfg.biz_name || '—'}</strong></div>
              <div>📞 מספר דנה: <strong dir="ltr">{botPhone}</strong></div>
              <div>🌐 עברית + אנגלית</div>
            </Box>
          </Box>

          {/* Greeting */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>💬</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>ברכת פתיחה</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <TextField fullWidth size="small" multiline rows={2} value={greeting} onChange={e => setGreeting(e.target.value)}
                placeholder={`היי שלום! הגעת ל-${cfg.biz_name}. מה קרה?`}
                sx={{ mb: '10px', '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } }} />
              <Button fullWidth size="small" variant="contained" onClick={handleSaveGreeting} sx={{ borderRadius: '10px', fontSize: 12 }}>💾 עדכן ברכה</Button>
            </Box>
          </Box>

          {/* Test */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>🧪</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>בדיקת שיחה</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <TextField fullWidth size="small" value={testPhone} onChange={e => setTestPhone(e.target.value)} dir="ltr" placeholder="+972501234567"
                sx={{ mb: '10px', '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 15 } }} />
              <Button fullWidth variant="contained" onClick={handleTestCall} disabled={testing}
                sx={{ borderRadius: '10px', py: 1, fontSize: 13, fontWeight: 700, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                {testing ? '⏳ מתקשרת...' : '📞 דנה, תתקשרי אליי'}
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

        {/* Right — Setup */}
        <Box>
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>📲</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>חבר את דנה לטלפון שלך — 2 דקות</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <Typography sx={{ fontSize: 13, color: '#57534E', lineHeight: 1.8, mb: '12px' }}>
                הלקוחות ממשיכים להתקשר <strong>למספר הרגיל שלך</strong>.<br />
                כשאתה לא עונה — דנה עונה במקומך.
              </Typography>

              <Box sx={{ bgcolor: '#F5F0EB', borderRadius: '10px', p: '12px', mb: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>מספר להעברה:</Typography>
                  <Typography dir="ltr" sx={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{botPhone}</Typography></Box>
                <Button size="small" onClick={copyNumber} sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, bgcolor: copied ? '#05966915' : '#4F46E510', color: copied ? '#059669' : '#4F46E5' }}>
                  {copied ? '✅ הועתק!' : '📋 העתק'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: '8px', mb: '14px' }}>
                {(['android', 'iphone'] as const).map(p => (
                  <Button key={p} onClick={() => setPlatform(p)} fullWidth
                    sx={{ borderRadius: '8px', py: 1, fontSize: 13, fontWeight: 600,
                      bgcolor: platform === p ? '#059669' : '#FAF7F4', color: platform === p ? '#fff' : '#78716C' }}>
                    {p === 'android' ? '🤖 אנדרואיד' : '🍎 אייפון'}
                  </Button>
                ))}
              </Box>

              {(platform === 'android' ? STEPS_ANDROID : STEPS_IPHONE).map((s, i, arr) => (
                <Box key={i} sx={{ display: 'flex', gap: '10px', py: '8px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#4F46E510', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{s.icon}</Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#57534E', pt: '4px' }}><strong>{i + 1}.</strong> {s.text}</Typography>
                </Box>
              ))}

              <Box sx={{ bgcolor: '#ECFDF5', borderRadius: '8px', p: '10px', mt: '12px', fontSize: 12, color: '#065F46', lineHeight: 1.7 }}>
                ✅ <strong>זהו!</strong> כשאתה עסוק — דנה עונה. הלקוחות מתקשרים כרגיל.
              </Box>

              <Typography sx={{ fontSize: 11, color: '#A8A29E', mt: '10px', lineHeight: 1.7 }}>
                💡 או: תתקשר לספק (פרטנר/סלקום/הוט) ותבקש "הפניית שיחות כשלא עונים ל-{botPhone}"
              </Typography>
            </Box>
          </Box>

          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', p: '16px 18px' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '10px' }}>💡 מה דנה עושה?</Typography>
            <Box sx={{ fontSize: 12, color: '#78716C', lineHeight: 2.2 }}>
              <div>✅ עונה 24/7 בעברית ואנגלית</div>
              <div>✅ שואלת שאלות חכמות</div>
              <div>✅ אוספת שם, טלפון, כתובת</div>
              <div>✅ משכנעת לקוחות מהססים</div>
              <div>✅ מטפלת בתלונות ובקשות למנהל</div>
              <div>✅ פותחת ליד אוטומטי במערכת</div>
              <div>✅ שולחת ללקוח לינק מעקב</div>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
