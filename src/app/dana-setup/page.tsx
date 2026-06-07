'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  MenuItem,
  Select,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { zikkitColors as c } from '@/styles/theme';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface BusinessService {
  id: string;
  name: string;
  pricingType: 'fixed' | 'variable' | 'quote';
  defaultPrice: string;
  whatToAsk: string;
}

interface DanaConfig {
  // Step 1
  businessName: string;
  contactName: string;
  // Step 2
  services: BusinessService[];
  // Step 3
  appointmentHandling: 'collect' | 'schedule' | 'qa_only';
  // Step 4
  voiceId: string;
  voiceName: string;
  // Step 5
  greeting: string;
  fieldsToCollect: {
    fullName: boolean;
    phone: boolean;
    reason: boolean;
    service: boolean;
    preferredDate: boolean;
    notes: boolean;
  };
  // Step 8 (assigned by server)
  phoneNumber?: string;
}

const VOICES = [
  { id: 'tai', name: 'תאי', letter: 'ת', gender: 'male', color: '#06B6D4' },
  { id: 'linda', name: 'לינדה', letter: 'ל', gender: 'female', color: '#4F46E5' },
  { id: 'roni', name: 'רוני', letter: 'ר', gender: 'male', color: '#EC4899' },
  { id: 'dani', name: 'דני', letter: 'ד', gender: 'male', color: '#F59E0B' },
  { id: 'maya', name: 'מאיה', letter: 'מ', gender: 'female', color: '#8B5CF6' },
];

const SERVICE_TEMPLATES = [
  'ניקוי משרדים ומוסדות',
  'ניקיון לאחר שיפוץ',
  'פוליש וקרצוף רצפות',
  'ניקיון חלונות בגובה',
  'אחזקת מבנים שוטפת',
  'ניקיון דירות לפני אכלוס',
];

export default function DanaSetupWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const [config, setConfig] = useState<DanaConfig>({
    businessName: '',
    contactName: '',
    services: [],
    appointmentHandling: 'schedule',
    voiceId: 'linda',
    voiceName: 'לינדה',
    greeting: '',
    fieldsToCollect: {
      fullName: true,
      phone: true,
      reason: true,
      service: true,
      preferredDate: true,
      notes: false,
    },
  });

  // Pre-fill greeting when business name changes
  useEffect(() => {
    if (config.businessName && !config.greeting) {
      const voice = VOICES.find((v) => v.id === config.voiceId);
      setConfig((p) => ({
        ...p,
        greeting: `שלום, הגעתם ל${config.businessName}, כאן ${voice?.name || 'דנה'}, במה אוכל לעזור לכם היום?`,
      }));
    }
  }, [config.businessName, config.voiceId]);

  const next = () => setStep((s) => Math.min(8, (s + 1) as Step));
  const back = () => setStep((s) => Math.max(1, (s - 1) as Step));

  const canProceed = () => {
    if (step === 1) return config.businessName.trim() && config.contactName.trim();
    if (step === 2) return config.services.length > 0;
    if (step === 4) return !!config.voiceId;
    if (step === 5) return config.greeting.trim().length > 10;
    return true;
  };

  const submitToServer = async () => {
    setProvisioning(true);
    try {
      const res = await fetch('/api/dana/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig((p) => ({ ...p, phoneNumber: data.phoneNumber }));
        setStep(8);
      } else {
        alert('שגיאה: ' + (data.error || 'לא ידועה'));
      }
    } catch (e) {
      alert('שגיאה בחיבור לשרת: ' + (e as Error).message);
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: c.bg, py: 6, px: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        {/* Top bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
          <Button onClick={() => router.push('/dashboard')} sx={{ color: c.text2, fontSize: 13 }}>
            ← חזרה לדף הבית
          </Button>
          <Typography sx={{ color: c.accent, fontWeight: 700, fontSize: 13 }}>
            שלב {step} מתוך 8
          </Typography>
        </Box>

        {/* Progress bar */}
        <Box sx={{ height: 4, bgcolor: c.surface3, borderRadius: 99, mb: 5, overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              width: `${(step / 8) * 100}%`,
              bgcolor: c.accent,
              transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </Box>

        {/* STEP 1 — Business details */}
        {step === 1 && (
          <Box className="zk-fade-up" sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: 56, mb: 2 }}>🏢</Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.text, mb: 1 }}>
              בואו נתחיל עם העסק שלכם
            </Typography>
            <Typography sx={{ fontSize: 14, color: c.text2, mb: 4 }}>
              כמה פרטים בסיסיים כדי להתחיל
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 460, mx: 'auto' }}>
              <TextField
                fullWidth
                placeholder="שם העסק (לדוגמה: ליאו שירותי ניקיון)"
                value={config.businessName}
                onChange={(e) => setConfig((p) => ({ ...p, businessName: e.target.value }))}
                sx={{ '& input': { textAlign: 'right', fontSize: 16, py: 1.5 } }}
              />
              <TextField
                fullWidth
                placeholder="שם איש קשר"
                value={config.contactName}
                onChange={(e) => setConfig((p) => ({ ...p, contactName: e.target.value }))}
                sx={{ '& input': { textAlign: 'right', fontSize: 16, py: 1.5 } }}
              />
              <Typography sx={{ fontSize: 12, color: c.text3, mt: 1 }}>
                המזכירה תשתמש בשם זה כשתעביר פניות
              </Typography>
            </Box>
          </Box>
        )}

        {/* STEP 2 — Services */}
        {step === 2 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ fontSize: 56, mb: 2 }}>🛎️</Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.text, mb: 1 }}>
                מה השירותים שהעסק מציע?
              </Typography>
              <Typography sx={{ fontSize: 14, color: c.text2 }}>
                הוסיפו את השירותים המרכזיים
              </Typography>
            </Box>

            {config.services.length === 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.text2, mb: 1.5 }}>
                  💡 הצעות מהירות:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {SERVICE_TEMPLATES.map((tmpl) => (
                    <Chip
                      key={tmpl}
                      label={tmpl}
                      onClick={() => {
                        setConfig((p) => ({
                          ...p,
                          services: [
                            ...p.services,
                            {
                              id: Date.now().toString() + Math.random(),
                              name: tmpl,
                              pricingType: 'fixed',
                              defaultPrice: '',
                              whatToAsk: '',
                            },
                          ],
                        }));
                      }}
                      sx={{
                        bgcolor: c.accentDim,
                        color: c.accent,
                        fontWeight: 600,
                        '&:hover': { bgcolor: c.accentMid },
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {config.services.map((service, idx) => (
                <Box
                  key={service.id}
                  sx={{
                    bgcolor: c.surface1,
                    border: '1px solid ' + c.border,
                    borderLeft: '3px solid ' + c.accent,
                    borderRadius: 3,
                    p: 2.5,
                    position: 'relative',
                  }}
                >
                  <IconButton
                    onClick={() =>
                      setConfig((p) => ({
                        ...p,
                        services: p.services.filter((s) => s.id !== service.id),
                      }))
                    }
                    sx={{ position: 'absolute', top: 8, left: 8, color: c.text3 }}
                  >
                    ✕
                  </IconButton>
                  <TextField
                    fullWidth
                    placeholder="שם השירות"
                    value={service.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setConfig((p) => ({
                        ...p,
                        services: p.services.map((s, i) => (i === idx ? { ...s, name: v } : s)),
                      }));
                    }}
                    sx={{ mb: 1.5, '& input': { fontWeight: 700, fontSize: 15 } }}
                  />
                  <Select
                    fullWidth
                    value={service.pricingType}
                    onChange={(e) => {
                      const v = e.target.value as 'fixed' | 'variable' | 'quote';
                      setConfig((p) => ({
                        ...p,
                        services: p.services.map((s, i) => (i === idx ? { ...s, pricingType: v } : s)),
                      }));
                    }}
                    sx={{ mb: 1.5 }}
                  >
                    <MenuItem value="fixed">מחיר קבוע</MenuItem>
                    <MenuItem value="variable">מחיר משתנה</MenuItem>
                    <MenuItem value="quote">הצעת מחיר</MenuItem>
                  </Select>
                  {service.pricingType !== 'quote' && (
                    <TextField
                      fullWidth
                      placeholder='לדוגמה: 500 ש"ח'
                      value={service.defaultPrice}
                      onChange={(e) => {
                        const v = e.target.value;
                        setConfig((p) => ({
                          ...p,
                          services: p.services.map((s, i) =>
                            i === idx ? { ...s, defaultPrice: v } : s
                          ),
                        }));
                      }}
                      sx={{ mb: 1.5 }}
                    />
                  )}
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="מה הסוכן צריך לדעת? (לדוגמה: גודל החדר, סגנון מועדף)"
                    value={service.whatToAsk}
                    onChange={(e) => {
                      const v = e.target.value;
                      setConfig((p) => ({
                        ...p,
                        services: p.services.map((s, i) => (i === idx ? { ...s, whatToAsk: v } : s)),
                      }));
                    }}
                  />
                </Box>
              ))}

              <Button
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    services: [
                      ...p.services,
                      {
                        id: Date.now().toString() + Math.random(),
                        name: '',
                        pricingType: 'fixed',
                        defaultPrice: '',
                        whatToAsk: '',
                      },
                    ],
                  }))
                }
                fullWidth
                variant="outlined"
                sx={{ py: 1.5, borderStyle: 'dashed', fontWeight: 600 }}
              >
                + הוסף שירות
              </Button>
            </Box>
          </Box>
        )}

        {/* STEP 3 — Appointment handling */}
        {step === 3 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ fontSize: 56, mb: 2 }}>📅</Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.text, mb: 1 }}>
                איך תרצו שהסוכן יטפל בתיאומים?
              </Typography>
              <Typography sx={{ fontSize: 14, color: c.text2 }}>בחרו את הדרך שמתאימה לכם</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                {
                  id: 'collect',
                  icon: '📋',
                  title: 'אסוף פרטים ואחזור ללקוח',
                  desc: 'הסוכן ישאל את הלקוח לשם ומספר טלפון, ויעביר אליך פנייה לטיפול.',
                },
                {
                  id: 'schedule',
                  icon: '📆',
                  title: 'קביעת מועד בשיחה',
                  desc: 'הסוכן ישאל את הלקוח איזה יום ושעה מתאים, וירשום את הבקשה ביומן שלך.',
                  recommended: true,
                },
                {
                  id: 'qa_only',
                  icon: '❌',
                  title: 'לא צריך תיאום',
                  desc: 'הסוכן יענה על שאלות ויעביר פרטים בלבד, ללא קביעת מועד.',
                },
              ].map((option) => (
                <Box
                  key={option.id}
                  onClick={() =>
                    setConfig((p) => ({
                      ...p,
                      appointmentHandling: option.id as DanaConfig['appointmentHandling'],
                    }))
                  }
                  sx={{
                    cursor: 'pointer',
                    bgcolor: c.surface1,
                    border:
                      '2px solid ' +
                      (config.appointmentHandling === option.id ? c.accent : c.border),
                    borderRadius: 3,
                    p: 3,
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: c.accent2 },
                    position: 'relative',
                  }}
                >
                  {option.recommended && (
                    <Chip
                      label="מומלץ"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: c.accent,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 10,
                      }}
                    />
                  )}
                  <Box sx={{ fontSize: 32 }}>{option.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: c.text, mb: 0.5 }}>
                      {option.title}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: c.text2, lineHeight: 1.6 }}>
                      {option.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* STEP 4 — Voice */}
        {step === 4 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ fontSize: 56, mb: 2 }}>🎙️</Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.text, mb: 1 }}>
                בחרו איך דנה תישמע
              </Typography>
              <Typography sx={{ fontSize: 14, color: c.text2 }}>
                בחרו קול ושמעו דוגמה
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 2,
              }}
            >
              {VOICES.map((v) => (
                <Box
                  key={v.id}
                  onClick={() =>
                    setConfig((p) => ({ ...p, voiceId: v.id, voiceName: v.name }))
                  }
                  sx={{
                    cursor: 'pointer',
                    bgcolor: c.surface1,
                    border: '2px solid ' + (config.voiceId === v.id ? c.accent : c.border),
                    borderRadius: 3,
                    p: 3,
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    position: 'relative',
                    '&:hover': { transform: 'translateY(-2px)', borderColor: c.accent2 },
                  }}
                >
                  {config.voiceId === v.id && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: c.accent,
                        color: '#fff',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                      }}
                    >
                      ✓
                    </Box>
                  )}
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: v.color,
                      color: '#fff',
                      fontSize: 28,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  >
                    {v.letter}
                  </Box>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: c.text, mb: 1 }}>
                    {v.name}
                  </Typography>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      const audio = new Audio(`/voices/${v.id}-sample.mp3`);
                      audio.play().catch(() => {});
                    }}
                    sx={{ bgcolor: c.accentDim, color: c.accent, width: 36, height: 36 }}
                  >
                    ▶
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* STEP 5 — Personality */}
        {step === 5 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ fontSize: 56, mb: 2 }}>💬</Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.text, mb: 1 }}>
                איך הסוכן שלכם יענה?
              </Typography>
              <Typography sx={{ fontSize: 14, color: c.text2 }}>
                התאימו את שורת הפתיחה ופרטים לאיסוף
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="שורת פתיחה"
              value={config.greeting}
              onChange={(e) => setConfig((p) => ({ ...p, greeting: e.target.value }))}
              sx={{ mb: 3 }}
            />

            <Typography sx={{ fontSize: 14, fontWeight: 700, color: c.text2, mb: 2 }}>
              מה הסוכן צריך לאסוף מהלקוח?
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                { id: 'fullName', label: 'שם מלא' },
                { id: 'phone', label: 'מספר טלפון' },
                { id: 'reason', label: 'סיבת פנייה' },
                { id: 'service', label: 'שירות מבוקש' },
                { id: 'preferredDate', label: 'תאריך מועדף' },
                { id: 'notes', label: 'הערות נוספות' },
              ].map((field) => {
                const isOn =
                  config.fieldsToCollect[field.id as keyof typeof config.fieldsToCollect];
                return (
                  <Box
                    key={field.id}
                    onClick={() =>
                      setConfig((p) => ({
                        ...p,
                        fieldsToCollect: {
                          ...p.fieldsToCollect,
                          [field.id]: !isOn,
                        },
                      }))
                    }
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isOn ? c.accentDim : c.surface1,
                      border: '1px solid ' + (isOn ? c.accent : c.border2),
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        bgcolor: isOn ? c.accent : c.surface3,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                      }}
                    >
                      {isOn ? '✓' : ''}
                    </Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                      {field.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* STEP 6 — Confirmation */}
        {step === 6 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ fontSize: 56, mb: 2 }}>✨</Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.text, mb: 1 }}>
                הסוכן שלכם כמעט מוכן
              </Typography>
              <Typography sx={{ fontSize: 14, color: c.text2 }}>
                בדקו שהכל נכון לפני המשך
              </Typography>
            </Box>

            <Box
              sx={{
                bgcolor: c.surface1,
                border: '1px solid ' + c.border,
                borderRadius: 4,
                p: 4,
              }}
            >
              {[
                { label: 'שם העסק', value: config.businessName },
                { label: 'איש קשר', value: config.contactName },
                { label: 'קול', value: config.voiceName },
                {
                  label: 'סגנון',
                  value:
                    config.appointmentHandling === 'schedule'
                      ? 'קביעת מועד בשיחה'
                      : config.appointmentHandling === 'collect'
                      ? 'אסוף ואחזור'
                      : 'שאלות ותשובות',
                },
                { label: 'שורת פתיחה', value: config.greeting },
                {
                  label: 'פרטים שייאספו',
                  value: Object.entries(config.fieldsToCollect)
                    .filter(([, v]) => v)
                    .map(([k]) =>
                      ({
                        fullName: 'שם מלא',
                        phone: 'טלפון',
                        reason: 'סיבת פנייה',
                        service: 'שירות',
                        preferredDate: 'תאריך',
                        notes: 'הערות',
                      }[k as keyof typeof config.fieldsToCollect])
                    )
                    .join(', '),
                },
              ].map((row, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    mb: 2,
                    pb: 2,
                    borderBottom: i < 5 ? '1px solid ' + c.border : 'none',
                  }}
                >
                  <Box sx={{ color: c.accent, fontSize: 18 }}>✓</Box>
                  <Box>
                    <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600 }}>
                      {row.label}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: c.text, fontWeight: 600 }}>
                      {row.value}
                    </Typography>
                  </Box>
                </Box>
              ))}

              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600, mb: 1 }}>
                  שירותים
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {config.services.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.name}
                      sx={{ bgcolor: c.accentDim, color: c.accent, fontWeight: 600 }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* STEP 7 — Provision (loading screen) */}
        {step === 7 && (
          <Box
            className="zk-fade-up"
            sx={{ textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <Box sx={{ fontSize: 64, mb: 3 }}>🚀</Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.text, mb: 2 }}>
              יוצרים את הסוכן שלכם
            </Typography>
            <Typography sx={{ fontSize: 14, color: c.text2, mb: 4 }}>
              זה ייקח כ-30 שניות
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400, mx: 'auto' }}>
              {[
                'יוצרים סוכן AI מותאם אישית',
                'מקצים מספר טלפון ייעודי',
                'מחברים את הקול שלכם',
                'משלימים הגדרות',
              ].map((step, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: c.surface1,
                    borderRadius: 2,
                    border: '1px solid ' + c.border,
                  }}
                >
                  {provisioning ? (
                    <CircularProgress size={20} sx={{ color: c.accent }} />
                  ) : (
                    <Box sx={{ color: c.accent, fontSize: 20 }}>✓</Box>
                  )}
                  <Typography sx={{ fontSize: 14, color: c.text }}>{step}</Typography>
                </Box>
              ))}
            </Box>
            {!provisioning && (
              <Button
                onClick={submitToServer}
                variant="contained"
                size="large"
                sx={{ mt: 4, py: 2, fontSize: 16, fontWeight: 800, borderRadius: 3, maxWidth: 400, mx: 'auto' }}
              >
                התחל בניית הסוכן
              </Button>
            )}
          </Box>
        )}

        {/* STEP 8 — Success + phone number */}
        {step === 8 && (
          <Box className="zk-fade-up" sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: c.accent,
                color: '#fff',
                fontSize: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              ✓
            </Box>
            <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1 }}>
              הסוכן שלכם מוכן! 🎉
            </Typography>
            <Typography sx={{ fontSize: 15, color: c.text2, mb: 5 }}>
              זה המספר שלקוחות יתקשרו אליו
            </Typography>

            <Box
              sx={{
                bgcolor: c.surface1,
                border: '2px solid ' + c.accent,
                borderRadius: 4,
                p: 4,
                maxWidth: 460,
                mx: 'auto',
                mb: 4,
              }}
            >
              <Typography sx={{ fontSize: 12, color: c.text3, fontWeight: 600, mb: 1 }}>
                מספר הסוכן שלכם
              </Typography>
              <Typography
                sx={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: c.accent,
                  fontFamily: 'monospace',
                  letterSpacing: 1,
                  mb: 2,
                }}
              >
                {config.phoneNumber || '+972-50-123-4567'}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  navigator.clipboard.writeText(config.phoneNumber || '');
                }}
                sx={{ borderRadius: 3, fontWeight: 600 }}
              >
                📋 העתק מספר
              </Button>
            </Box>

            <Box
              sx={{
                bgcolor: c.accentDim,
                border: '1px solid ' + c.accentMid,
                borderRadius: 3,
                p: 3,
                maxWidth: 460,
                mx: 'auto',
                mb: 4,
              }}
            >
              <Typography sx={{ fontSize: 13, color: c.accent, fontWeight: 700, mb: 1 }}>
                💡 רוצה לבדוק?
              </Typography>
              <Typography sx={{ fontSize: 13, color: c.text2, lineHeight: 1.7 }}>
                התקשרו עכשיו למספר שלמעלה ושוחחו עם {config.voiceName}.
                כל שיחה מופיעה בדאשבורד שלכם בזמן אמת.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/dashboard')}
              sx={{ py: 2, px: 5, fontSize: 15, fontWeight: 800, borderRadius: 3 }}
            >
              עבור לדאשבורד →
            </Button>
          </Box>
        )}

        {/* Navigation buttons */}
        {step >= 1 && step <= 6 && (
          <Box sx={{ display: 'flex', gap: 2, mt: 6, maxWidth: 460, mx: 'auto' }}>
            {step > 1 && (
              <Button onClick={back} fullWidth variant="outlined" sx={{ py: 2, borderRadius: 3 }}>
                חזרה
              </Button>
            )}
            <Button
              onClick={step === 6 ? () => setStep(7) : next}
              disabled={!canProceed() || loading}
              fullWidth
              variant="contained"
              sx={{ py: 2, borderRadius: 3, fontWeight: 800, fontSize: 15 }}
            >
              {step === 6 ? 'שמרו והמשיכו ✓' : 'המשך →'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
