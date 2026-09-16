'use client';
import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';

const STEPS_ANDROID = [
  '📱 פתח אפליקציית הטלפון',
  '⚙️ לחץ ⋮ → הגדרות → העברת שיחות',
  '🔄 לחץ "כשלא עונים"',
  '✏️ הכנס את המספר למעלה → אישור',
];
const STEPS_IPHONE = [
  '📱 הגדרות → טלפון → העברת שיחות',
  '🟢 הפעל את המתג',
  '✏️ הכנס את המספר למעלה',
  '💡 או: תתקשר לספק ותבקש הפניה',
];

export default function AiBotPage() {
  const { cfg, saveCfg } = useData();
  const { toast } = useToast();
  const [greeting, setGreeting] = useState('');
  const [botPhone, setBotPhone] = useState('');
  const [platform, setPlatform] = useState<'android' | 'iphone'>('android');
  const [copied, setCopied] = useState(false);

  const active = (cfg as any).bot_active && (cfg as any).bot_phone;

  useEffect(() => {
    setGreeting((cfg as any).bot_greeting || '');
    setBotPhone((cfg as any).bot_phone || '');
  }, [cfg]);

  const handleActivate = async () => {
    if (!botPhone) { toast('הכנס מספר טלפון של הבוט'); return; }
    await saveCfg({ ...cfg, bot_active: true, bot_phone: botPhone, bot_greeting: greeting });
    toast('✅ דנה הופעלה!');
  };

  const handleSave = async () => {
    await saveCfg({ ...cfg, bot_greeting: greeting });
    toast('✅ נשמר');
  };

  const copy = () => {
    navigator.clipboard?.writeText((cfg as any).bot_phone || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (!active) {
    return (
      <Box className="zk-fade-up" sx={{ maxWidth: 500, mx: 'auto' }}>
        <Box sx={{ mb: '20px' }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>🤖 דנה — המזכירה AI שלך</Typography>
          <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>עונה ללקוחות כשאתה לא עונה. 24/7.</Typography>
        </Box>

        <Box sx={{ bgcolor: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', p: '30px', textAlign: 'center', mb: '14px' }}>
          <Typography sx={{ fontSize: 60, mb: 2 }}>🤖📞</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 3 }}>הפעל את דנה</Typography>

          <Box sx={{ textAlign: 'right', mb: '14px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>מספר הבוט</Typography>
            <TextField fullWidth size="small" value={botPhone} onChange={e => setBotPhone(e.target.value)} dir="ltr"
              placeholder="+972XXXXXXXXX" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 15 } }} />
            <Typography sx={{ fontSize: 10, color: '#A8A29E', mt: '4px' }}>המספר שהוקצה לעסק שלך</Typography>
          </Box>

          <Box sx={{ textAlign: 'right', mb: '14px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>ברכה מותאמת (אופציונלי)</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={greeting} onChange={e => setGreeting(e.target.value)}
              placeholder={`היי שלום! הגעת ל-${cfg.biz_name || 'העסק'}. איך אפשר לעזור?`}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } }} />
          </Box>

          <Button fullWidth variant="contained" onClick={handleActivate}
            sx={{ borderRadius: '12px', py: 1.5, fontSize: 16, fontWeight: 800, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
            🚀 הפעל את דנה
          </Button>

          <Box sx={{ mt: 2, fontSize: 11, color: '#A8A29E', lineHeight: 1.8 }}>
            ✅ לא צריך לשנות מספר · ✅ הלקוחות מתקשרים כרגיל · ✅ הגדרה ב-2 דקות
          </Box>
        </Box>

        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', p: '20px' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '10px' }}>💡 מה דנה עושה?</Typography>
          <Box sx={{ fontSize: 12, color: '#78716C', lineHeight: 2.2 }}>
            <div>✅ עונה 24/7 בעברית ואנגלית</div>
            <div>✅ מזהה אוטומטית את שם העסק וסוג השירות</div>
            <div>✅ שואלת שאלות חכמות לפי סוג הבעיה</div>
            <div>✅ אוספת שם, טלפון, כתובת</div>
            <div>✅ בודקת זמינות טכנאים בזמן אמת</div>
            <div>✅ משכנעת לקוחות מהססים</div>
            <div>✅ מטפלת בתלונות ובקשות למנהל</div>
            <div>✅ פותחת ליד אוטומטי במערכת</div>
            <div>✅ שולחת ללקוח לינק מעקב</div>
          </Box>
        </Box>
      </Box>
    );
  }

  // Active state
  return (
    <Box className="zk-fade-up">
      <Box sx={{ mb: '20px' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>🤖 דנה — המזכירה AI שלך</Typography>
        <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>עונה ללקוחות כשאתה לא עונה. 24/7.</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '14px' }}>
        {/* Left */}
        <Box>
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', p: '18px', mb: '14px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '12px' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#059669' }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>דנה פעילה ✅</Typography>
            </Box>
            <Box sx={{ fontSize: 13, color: '#78716C', lineHeight: 2 }}>
              <div>🏢 <strong>{cfg.biz_name || '—'}</strong></div>
              <div>🔧 {cfg.biz_type || '—'}</div>
              <div>📞 <span dir="ltr">{(cfg as any).bot_phone}</span></div>
            </Box>
          </Box>

          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', p: '18px', mb: '14px' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '10px' }}>💬 ברכת פתיחה</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={greeting} onChange={e => setGreeting(e.target.value)}
              placeholder={`היי שלום! הגעת ל-${cfg.biz_name}. איך אפשר לעזור?`}
              sx={{ mb: '10px', '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } }} />
            <Button fullWidth size="small" variant="contained" onClick={handleSave} sx={{ borderRadius: '10px', fontSize: 12 }}>💾 עדכן</Button>
          </Box>

          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', p: '18px' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '10px' }}>💡 מה דנה עושה?</Typography>
            <Box sx={{ fontSize: 12, color: '#78716C', lineHeight: 2.2 }}>
              <div>✅ מזהה את העסק שלך אוטומטית</div>
              <div>✅ שואלת שאלות מותאמות לסוג השירות</div>
              <div>✅ בודקת זמינות טכנאים</div>
              <div>✅ אוספת פרטים ופותחת ליד</div>
              <div>✅ שולחת ללקוח לינק מעקב</div>
              <div>✅ מטפלת בתלונות ומעבירה למנהל</div>
            </Box>
          </Box>
        </Box>

        {/* Right — setup guide */}
        <Box>
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', p: '18px' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: '6px' }}>📲 חבר את דנה לטלפון שלך</Typography>
            <Typography sx={{ fontSize: 12, color: '#78716C', mb: '12px' }}>הלקוחות ממשיכים להתקשר למספר הרגיל שלך. כשלא עונה — דנה עונה.</Typography>

            <Box sx={{ bgcolor: '#F5F0EB', borderRadius: '10px', p: '12px', mb: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box><Typography sx={{ fontSize: 10, color: '#A8A29E' }}>מספר להעברה:</Typography>
                <Typography dir="ltr" sx={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{(cfg as any).bot_phone}</Typography></Box>
              <Button size="small" onClick={copy} sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, bgcolor: copied ? '#05966915' : '#4F46E510', color: copied ? '#059669' : '#4F46E5' }}>
                {copied ? '✅ הועתק' : '📋 העתק'}
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

            {(platform === 'android' ? STEPS_ANDROID : STEPS_IPHONE).map((s, i) => (
              <Box key={i} sx={{ display: 'flex', gap: '10px', py: '6px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <Typography sx={{ fontSize: 12, color: '#57534E' }}><strong>{i + 1}.</strong> {s}</Typography>
              </Box>
            ))}

            <Box sx={{ bgcolor: '#ECFDF5', borderRadius: '8px', p: '10px', mt: '12px', fontSize: 12, color: '#065F46' }}>
              ✅ <strong>זהו!</strong> כשלא עונה — דנה עונה. הלקוחות מתקשרים כרגיל.
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
