'use client';
import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Select, MenuItem } from '@mui/material';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';

export default function AiBotPage() {
  const { cfg, saveCfg } = useData();
  const { toast } = useToast();

  const [greeting, setGreeting] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [phone, setPhone] = useState('');
  const [testPhone, setTestPhone] = useState('+972');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState('');

  useEffect(() => {
    setGreeting((cfg as any).bot_greeting || '');
    setVoice((cfg as any).bot_voice || 'alloy');
    setPhone((cfg as any).bot_phone || process.env.NEXT_PUBLIC_TWILIO_PHONE || '');
  }, [cfg]);

  const handleSave = async () => {
    await saveCfg({ ...cfg, bot_greeting: greeting, bot_voice: voice, bot_phone: phone });
    toast('✅ הגדרות בוט נשמרו');
  };

  const handleTestCall = async () => {
    if (testPhone.length < 10) return;
    setTesting(true); setTestStatus('📞 מתקשר...');
    try {
      const res = await fetch('/api/test-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: testPhone }) });
      const data = await res.json();
      if (data.success) setTestStatus('✅ הטלפון שלך אמור לצלצל! תענה.');
      else setTestStatus('❌ ' + (data.error || 'שגיאה'));
    } catch { setTestStatus('❌ שגיאת רשת'); }
    setTesting(false);
  };

  const isConfigured = !!(process.env.NEXT_PUBLIC_TWILIO_PHONE || (cfg as any).bot_phone);

  return (
    <Box className="zk-fade-up">
      <Box sx={{ mb: '20px' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800 }}>🤖 בוט קולי AI</Typography>
        <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>הגדר את העוזר הטלפוני שלך</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '14px' }}>
        {/* Settings */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Typography sx={{ fontSize: 16 }}>⚙️</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>הגדרות</Typography>
          </Box>
          <Box sx={{ p: '16px 18px' }}>
            <Box sx={{ mb: '14px' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>ברכת פתיחה</Typography>
              <TextField fullWidth size="small" multiline rows={3} value={greeting} onChange={e => setGreeting(e.target.value)}
                placeholder={`שלום! הגעת ל-${cfg.biz_name || 'העסק'}. איך אוכל לעזור?`}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } }} />
              <Typography sx={{ fontSize: 10, color: '#A8A29E', mt: '4px' }}>השאר ריק לברכה אוטומטית עם שם העסק</Typography>
            </Box>

            <Box sx={{ mb: '14px' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>סגנון קול</Typography>
              <Select fullWidth size="small" value={voice} onChange={e => setVoice(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } }}>
                <MenuItem value="alloy">🎙️ Alloy — מאוזן, מקצועי</MenuItem>
                <MenuItem value="echo">🎙️ Echo — חם, ידידותי</MenuItem>
                <MenuItem value="nova">🎙️ Nova — אנרגטי, עליז</MenuItem>
                <MenuItem value="shimmer">🎙️ Shimmer — רך, מרגיע</MenuItem>
                <MenuItem value="onyx">🎙️ Onyx — עמוק, סמכותי</MenuItem>
              </Select>
            </Box>

            <Button fullWidth variant="contained" onClick={handleSave} sx={{ borderRadius: '10px', py: 1, fontSize: 13, fontWeight: 700 }}>💾 שמור הגדרות</Button>
          </Box>
        </Box>

        {/* Status + Test */}
        <Box>
          {/* Status */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>📊</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>סטטוס</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '10px' }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#059669' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>הבוט מוגדר ופעיל</Typography>
              </Box>
              <Box sx={{ fontSize: 12, color: '#78716C', lineHeight: 1.8 }}>
                <div>📞 מספר: <strong dir="ltr">+18204446549</strong></div>
                <div>🏢 עסק: <strong>{cfg.biz_name || '—'}</strong></div>
                <div>🔧 סוג: <strong>{cfg.biz_type || '—'}</strong></div>
                <div>🌐 שפה: <strong>עברית + אנגלית (אוטומטי)</strong></div>
              </Box>
            </Box>
          </Box>

          {/* Test call */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', mb: '14px' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>🧪</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>בדיקת שיחה</Typography>
            </Box>
            <Box sx={{ p: '16px 18px' }}>
              <Typography sx={{ fontSize: 12, color: '#78716C', mb: '10px' }}>הכנס מספר טלפון — הבוט יתקשר אליך</Typography>
              <TextField fullWidth size="small" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+972501234567" dir="ltr"
                sx={{ mb: '10px', '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 15 } }} />
              <Button fullWidth variant="contained" onClick={handleTestCall} disabled={testing || testPhone.length < 10}
                sx={{ borderRadius: '10px', py: 1, fontSize: 13, fontWeight: 700, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                {testing ? '⏳ מתקשר...' : '📞 תתקשר אליי לבדיקה'}
              </Button>
              {testStatus && (
                <Box sx={{ mt: '10px', p: '10px', borderRadius: '8px', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  bgcolor: testStatus.includes('❌') ? '#FEF2F2' : '#ECFDF5',
                  color: testStatus.includes('❌') ? '#DC2626' : '#059669' }}>
                  {testStatus}
                </Box>
              )}
            </Box>
          </Box>

          {/* What the bot does */}
          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography sx={{ fontSize: 16 }}>💡</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>מה הבוט עושה?</Typography>
            </Box>
            <Box sx={{ p: '16px 18px', fontSize: 12, color: '#78716C', lineHeight: 2 }}>
              <div>✅ עונה ללקוחות 24/7 בעברית ואנגלית</div>
              <div>✅ שואל שאלות מותאמות לסוג העסק</div>
              <div>✅ אוסף שם, טלפון, כתובת, תיאור בעיה</div>
              <div>✅ משכנע לקוחות לקבוע ביקור</div>
              <div>✅ פותח ליד אוטומטית במערכת</div>
              <div>✅ שומר היסטוריית שיחות</div>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
