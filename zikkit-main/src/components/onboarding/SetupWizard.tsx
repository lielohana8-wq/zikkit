'use client';

import { useState } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem } from '@mui/material';
import { useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/hooks/useToast';

const STEPS = [
  { title: 'פרטי העסק', icon: '🏢', desc: 'שם, טלפון, סוג העסק' },
  { title: 'הגדרות כספיות', icon: '💰', desc: 'מטבע, מע"מ, יעד הכנסה' },
  { title: 'טכנאי ראשון', icon: '👷', desc: 'הוסף טכנאי אחד להתחלה' },
  { title: 'סיום!', icon: '🚀', desc: 'הכל מוכן — בהצלחה!' },
];

const BIZ_TYPES = [
  { value: 'hvac', label: '❄️ מיזוג אוויר (HVAC)' },
  { value: 'plumbing', label: '🔧 אינסטלציה' },
  { value: 'electrical', label: '⚡ חשמל' },
  { value: 'garage', label: '🚗 דלתות מוסך' },
  { value: 'locksmith', label: '🔑 מנעולן' },
  { value: 'chimney', label: '🏠 ארובות' },
  { value: 'general', label: '🔨 שירותי שדה כללי' },
];

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const { cfg, saveCfg, db, saveData } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Step 1
  const [bizName, setBizName] = useState(cfg.biz_name || '');
  const [bizPhone, setBizPhone] = useState(cfg.biz_phone || '');
  const [bizEmail, setBizEmail] = useState(cfg.biz_email || user?.email || '');
  const [bizType, setBizType] = useState(cfg.biz_type || 'general');
  const [bizAddress, setBizAddress] = useState(cfg.biz_address || '');

  // Step 2
  const [currency, setCurrency] = useState(cfg.currency || 'ILS');
  const [taxRate, setTaxRate] = useState(cfg.tax_rate || 17);
  const [monthlyGoal, setMonthlyGoal] = useState((cfg as Record<string, unknown>).monthlyGoal as number || 0);

  // Step 3
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techEmail, setTechEmail] = useState('');
  const [techCommission, setTechCommission] = useState(10);

  const handleSaveStep1 = async () => {
    if (!bizName.trim()) { toast('הכנס שם עסק', '#ff4d6d'); return; }
    await saveCfg({ ...cfg, biz_name: bizName, biz_phone: bizPhone, biz_email: bizEmail, biz_type: bizType, biz_address: bizAddress, region: currency === 'ILS' ? 'IL' : 'US' });
    setStep(1);
  };

  const handleSaveStep2 = async () => {
    await saveCfg({ ...cfg, currency, tax_rate: taxRate, monthlyGoal });
    setStep(2);
  };

  const handleSaveStep3 = async () => {
    if (techName.trim()) {
      const newTech = {
        id: 'tech_' + Date.now(),
        name: techName,
        phone: techPhone,
        email: techEmail,
        role: 'technician' as const,
        commission: techCommission,
        active: true,
        created: new Date().toISOString(),
      };
      const users = [...(db.users || [])];
      users.push(newTech);
      await saveData({ ...db, users });
    }
    setStep(3);
  };

  const handleFinish = async () => {
    await saveCfg({ ...cfg, setup_done: true });
    toast('🎉 העסק שלך מוכן!');
    onComplete();
  };

  const c = { bg: '#07090b', surface: '#FAF7F4', accent: '#4F46E5', blue: '#4f8fff', text: '#e8f0f4', text2: '#A8A29E', text3: '#78716C', border: 'rgba(0,0,0,0.06)' };

  const inputSx = { '& .MuiInputBase-root': { bgcolor: '#0a0c10', borderRadius: '10px', fontSize: 13, color: c.text }, '& .MuiOutlinedInput-notchedOutline': { borderColor: c.border }, '& .MuiInputLabel-root': { fontSize: 11, fontWeight: 700, color: c.text3, textTransform: 'uppercase' as const } };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Box sx={{ width: '100%', maxWidth: 560 }}>

        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 56, height: 56, bgcolor: c.accent, borderRadius: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#000', mb: 2 }}>Zk</Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: c.text }}>הקמת העסק שלך</Typography>
        </Box>

        {/* Steps indicator */}
        <Box sx={{ display: 'flex', gap: 1, mb: 4, justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
                bgcolor: i < step ? c.accent : i === step ? 'rgba(0,229,176,0.15)' : 'rgba(255,255,255,0.04)',
                color: i < step ? '#000' : i === step ? c.accent : c.text3,
                fontWeight: 800, transition: 'all 0.3s',
              }}>
                {i < step ? '✓' : s.icon}
              </Box>
              {i < STEPS.length - 1 && <Box sx={{ width: 30, height: 2, bgcolor: i < step ? c.accent : 'rgba(0,0,0,0.06)', borderRadius: 1 }} />}
            </Box>
          ))}
        </Box>

        {/* Card */}
        <Box sx={{ bgcolor: c.surface, border: '1px solid ' + c.border, borderRadius: '16px', p: 4 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: c.text, mb: 0.5 }}>
            {STEPS[step].icon} {STEPS[step].title}
          </Typography>
          <Typography sx={{ fontSize: 12, color: c.text3, mb: 3 }}>{STEPS[step].desc}</Typography>

          {/* Step 1: Business Info */}
          {step === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label={"שם העסק"} value={bizName} onChange={(e) => setBizName(e.target.value)} fullWidth sx={inputSx} />
              <TextField label={"טלפון"} value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} fullWidth sx={inputSx} />
              <TextField label={"אימייל"} value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} fullWidth sx={inputSx} />
              <TextField label={"כתובת"} value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} fullWidth sx={inputSx} />
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.text3, textTransform: 'uppercase', mb: 0.5 }}>סוג עסק</Typography>
                <Select value={bizType} onChange={(e) => setBizType(e.target.value)} fullWidth size="small"
                  sx={{ bgcolor: '#0a0c10', borderRadius: '10px', fontSize: 13, color: c.text, '& .MuiOutlinedInput-notchedOutline': { borderColor: c.border } }}>
                  {BIZ_TYPES.map((t) => <MenuItem key={t.value} value={t.value} sx={{ fontSize: 12 }}>{t.label}</MenuItem>)}
                </Select>
              </Box>
              <Button onClick={handleSaveStep1} variant="contained" fullWidth sx={{
                mt: 1, py: 1.5, fontSize: 14, fontWeight: 800, borderRadius: '12px',
                background: 'linear-gradient(135deg, #4F46E5, #00a882)', color: '#000',
              }}>
                המשך →
              </Button>
            </Box>
          )}

          {/* Step 2: Financial */}
          {step === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.text3, textTransform: 'uppercase', mb: 0.5 }}>מטבע</Typography>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)} fullWidth size="small"
                  sx={{ bgcolor: '#0a0c10', borderRadius: '10px', fontSize: 13, color: c.text, '& .MuiOutlinedInput-notchedOutline': { borderColor: c.border } }}>
                  <MenuItem value="ILS" sx={{ fontSize: 12 }}>🇮🇱 ₪ שקל</MenuItem>
                  <MenuItem value="USD" sx={{ fontSize: 12 }}>🇺🇸 $ דולר</MenuItem>
                  <MenuItem value="EUR" sx={{ fontSize: 12 }}>🇪🇺 € יורו</MenuItem>
                </Select>
              </Box>
              <TextField label='אחוז מע"מ' type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} fullWidth sx={inputSx} />
              <TextField label={"יעד הכנסה חודשי"} type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(Number(e.target.value))} fullWidth sx={inputSx}
                helperText={"יוצג כ-progress bar בדשבורד"} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button onClick={() => setStep(0)} variant="outlined" sx={{ flex: 1, py: 1.5, fontSize: 13, fontWeight: 700, borderRadius: '12px', color: c.text3, borderColor: c.border }}>
                  ← חזרה
                </Button>
                <Button onClick={handleSaveStep2} variant="contained" sx={{
                  flex: 2, py: 1.5, fontSize: 14, fontWeight: 800, borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4F46E5, #00a882)', color: '#000',
                }}>
                  המשך →
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 3: First Technician */}
          {step === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(79,143,255,0.06)', border: '1px solid rgba(79,143,255,0.15)', borderRadius: '10px', p: 2 }}>
                <Typography sx={{ fontSize: 11, color: '#4f8fff' }}>💡 אפשר לדלג ולהוסיף טכנאים אחר כך מדף "טכנאים"</Typography>
              </Box>
              <TextField label={"שם טכנאי"} value={techName} onChange={(e) => setTechName(e.target.value)} fullWidth sx={inputSx} />
              <TextField label={"טלפון"} value={techPhone} onChange={(e) => setTechPhone(e.target.value)} fullWidth sx={inputSx} />
              <TextField label={"אימייל"} value={techEmail} onChange={(e) => setTechEmail(e.target.value)} fullWidth sx={inputSx} />
              <TextField label={"אחוז עמלה"} type="number" value={techCommission} onChange={(e) => setTechCommission(Number(e.target.value))} fullWidth sx={inputSx} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button onClick={() => setStep(1)} variant="outlined" sx={{ flex: 1, py: 1.5, fontSize: 13, fontWeight: 700, borderRadius: '12px', color: c.text3, borderColor: c.border }}>
                  ← חזרה
                </Button>
                <Button onClick={handleSaveStep3} variant="contained" sx={{
                  flex: 2, py: 1.5, fontSize: 14, fontWeight: 800, borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4F46E5, #00a882)', color: '#000',
                }}>
                  {techName.trim() ? 'הוסף והמשך →' : 'דלג →'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 4: Done! */}
          {step === 3 && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography sx={{ fontSize: 48, mb: 2 }}>🎉</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: c.accent, mb: 1 }}>העסק שלך מוכן!</Typography>
              <Typography sx={{ fontSize: 13, color: c.text2, mb: 3, lineHeight: 1.8 }}>
                {bizName} הוקם בהצלחה.<br />
                עכשיו אפשר: להוסיף עבודות, לנהל לידים, לשלוח הצעות מחיר, להפעיל בוט AI, ועוד.
              </Typography>
              <Button onClick={handleFinish} variant="contained" fullWidth sx={{
                py: 1.5, fontSize: 16, fontWeight: 800, borderRadius: '12px',
                background: 'linear-gradient(135deg, #4F46E5, #00a882)', color: '#000',
                boxShadow: '0 8px 24px rgba(0,229,176,0.2)',
              }}>
                🚀 יאללה, מתחילים!
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
