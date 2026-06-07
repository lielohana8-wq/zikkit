'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
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
  businessName: string;
  contactName: string;
  businessType?: string;
  industry?: string;
  services: BusinessService[];
  appointmentHandling: 'collect' | 'schedule' | 'qa_only';
  voiceId: string;
  voiceName: string;
  greeting: string;
  fieldsToCollect: {
    fullName: boolean;
    phone: boolean;
    reason: boolean;
    service: boolean;
    preferredDate: boolean;
    notes: boolean;
  };
  phoneNumber?: string;
}

const VOICES = [
  { id: 'noa', name: 'נועה', letter: 'נ', gender: 'female', color: '#4F46E5', desc: 'נעימה ומקצועית' },
  { id: 'tomer', name: 'תומר', letter: 'ת', gender: 'male', color: '#06B6D4', desc: 'רגוע וענייני' },
  { id: 'sharon', name: 'שרון', letter: 'ש', gender: 'female', color: '#EC4899', desc: 'חמה ואדיבה' },
  { id: 'eitan', name: 'איתן', letter: 'א', gender: 'male', color: '#F59E0B', desc: 'אנרגטי וחברותי' },
  { id: 'maya', name: 'מאיה', letter: 'מ', gender: 'female', color: '#8B5CF6', desc: 'צעירה ותוססת' },
];

export default function DanaSetupWizard() {
  const router = useRouter();
  const { user, firebaseUser, bizId } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [provisioning, setProvisioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDetected, setAiDetected] = useState(false);

  const [config, setConfig] = useState<DanaConfig>({
    businessName: '',
    contactName: '',
    services: [],
    appointmentHandling: 'schedule',
    voiceId: 'noa',
    voiceName: 'נועה',
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

  // Auto-generate greeting based on voice + business name
  useEffect(() => {
    if (config.businessName && config.voiceName) {
      const voice = VOICES.find((v) => v.id === config.voiceId);
      const newGreeting = `שלום, הגעתם ל${config.businessName}, כאן ${voice?.name}, איך אפשר לעזור?`;
      // Only update if greeting is empty or auto-generated
      if (!config.greeting || config.greeting.includes('הגעתם ל')) {
        setConfig((p) => ({ ...p, greeting: newGreeting }));
      }
    }
  }, [config.businessName, config.voiceId, config.voiceName]);

  useEffect(() => {
    if (!firebaseUser && !user) {
      router.push('/login');
    }
  }, [firebaseUser, user, router]);

  // ===== AI BUSINESS DETECTION =====
  const detectBusinessWithAI = async () => {
    if (!config.businessName.trim()) return;
    setAiLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/dana/suggest-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: config.businessName }),
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        return;
      }

      setConfig((p) => ({
        ...p,
        businessType: data.businessType,
        industry: data.industry,
        services: data.services || [],
        greeting: data.suggestedGreeting || p.greeting,
        fieldsToCollect: data.suggestedFields || p.fieldsToCollect,
      }));
      setAiDetected(true);
    } catch (e) {
      setErrorMsg('שגיאה בזיהוי העסק. אפשר להמשיך ידנית.');
    } finally {
      setAiLoading(false);
    }
  };

  const next = () => setStep((s) => Math.min(8, (s + 1) as Step));
  const back = () => setStep((s) => Math.max(1, (s - 1) as Step));

  const canProceed = () => {
    if (step === 1) return config.businessName.trim() && config.contactName.trim();
    if (step === 2) return config.services.length > 0 && config.services.every((s) => s.name.trim());
    if (step === 4) return !!config.voiceId;
    if (step === 5) return config.greeting.trim().length > 10;
    return true;
  };

  const submitToServer = async () => {
    setProvisioning(true);
    setErrorMsg(null);
    try {
      if (!firebaseUser) throw new Error('צריך להתחבר. רענן את הדף ונסה שוב.');
      const idToken = await firebaseUser.getIdToken();
      const userBizId = bizId || firebaseUser.uid;

      const res = await fetch('/api/dana/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          'x-biz-id': userBizId,
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (data.success) {
        setConfig((p) => ({ ...p, phoneNumber: data.phoneNumber }));
        setStep(8);
      } else {
        throw new Error(data.error || 'שגיאה לא ידועה');
      }
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: c.bg, py: { xs: 3, md: 6 }, px: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        {/* Top bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
          <Button
            onClick={() => router.push('/dashboard')}
            sx={{ color: c.text2, fontSize: 13, textTransform: 'none' }}
          >
            {'← חזרה'}
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Box
                key={n}
                sx={{
                  width: n === step ? 24 : 6,
                  height: 6,
                  borderRadius: 99,
                  bgcolor: n <= step ? c.accent : c.surface4,
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* ====== STEP 1: Business Identity ====== */}
        {step === 1 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: c.accentDim,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {'🏢'}
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1, lineHeight: 1.2 }}>
                {'בוא נכיר את העסק'}
              </Typography>
              <Typography sx={{ fontSize: 15, color: c.text2, maxWidth: 460, mx: 'auto', lineHeight: 1.6 }}>
                {'תזין שם עסק - והבינה המלאכותית שלנו תזהה אוטומטית את התחום ותציע שירותים מותאמים'}
              </Typography>
            </Box>

            <Box sx={{ maxWidth: 480, mx: 'auto' }}>
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: c.text2, mb: 1 }}>
                  {'שם העסק'}
                </Typography>
                <TextField
                  fullWidth
                  placeholder="ליאו שירותי ניקיון"
                  value={config.businessName}
                  onChange={(e) => {
                    setConfig((p) => ({ ...p, businessName: e.target.value }));
                    setAiDetected(false);
                  }}
                  sx={{ '& input': { fontSize: 17, py: 1.7, textAlign: 'right' } }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: c.text2, mb: 1 }}>
                  {'שם איש הקשר'}
                </Typography>
                <TextField
                  fullWidth
                  placeholder="ליאל אוחנה"
                  value={config.contactName}
                  onChange={(e) => setConfig((p) => ({ ...p, contactName: e.target.value }))}
                  sx={{ '& input': { fontSize: 17, py: 1.7, textAlign: 'right' } }}
                />
                <Typography sx={{ fontSize: 11, color: c.text3, mt: 0.75 }}>
                  {'שם זה ייוצג ללקוחות כאיש הקשר העיקרי'}
                </Typography>
              </Box>

              {/* AI Detection Button */}
              {config.businessName.trim() && !aiDetected && (
                <Box className="zk-fade-up" sx={{ mb: 3 }}>
                  <Button
                    onClick={detectBusinessWithAI}
                    disabled={aiLoading}
                    fullWidth
                    variant="outlined"
                    sx={{
                      py: 1.75,
                      borderRadius: 3,
                      borderColor: c.accent,
                      color: c.accent,
                      fontSize: 14,
                      fontWeight: 700,
                      bgcolor: c.accentDim,
                      '&:hover': { bgcolor: c.accentMid, borderColor: c.accent3 },
                    }}
                  >
                    {aiLoading ? (
                      <>
                        <CircularProgress size={16} sx={{ color: c.accent, mr: 1 }} />
                        {'מזהה את העסק...'}
                      </>
                    ) : (
                      <>{'✨ זהה את העסק אוטומטית עם AI'}</>
                    )}
                  </Button>
                </Box>
              )}

              {/* AI Detection Result */}
              {aiDetected && config.businessType && (
                <Box
                  className="zk-fade-up"
                  sx={{
                    bgcolor: c.surface1,
                    border: `2px solid ${c.accent}`,
                    borderRadius: 3,
                    p: 2.5,
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ fontSize: 20 }}>{'✓'}</Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: c.accent }}>
                      {'זוהה אוטומטית'}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: c.text2, mb: 1.5, lineHeight: 1.6 }}>
                    <strong>{config.businessType}</strong>
                  </Typography>
                  <Chip
                    label={config.industry}
                    size="small"
                    sx={{ bgcolor: c.accentDim, color: c.accent, fontWeight: 700, mb: 1 }}
                  />
                  <Typography sx={{ fontSize: 12, color: c.text3, mt: 1, lineHeight: 1.6 }}>
                    {'הכנו עבורך '}{config.services.length}{' שירותים מומלצים — תוכל לערוך הכל בשלב הבא'}
                  </Typography>
                </Box>
              )}

              {errorMsg && (
                <Box sx={{ bgcolor: c.hotDim, border: `1px solid ${c.hot}`, borderRadius: 2, p: 2, mb: 2 }}>
                  <Typography sx={{ fontSize: 13, color: c.hot }}>{errorMsg}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* ====== STEP 2: Services ====== */}
        {step === 2 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: c.accentDim,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {'🛠️'}
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1 }}>
                {'מה אנחנו מציעים?'}
              </Typography>
              <Typography sx={{ fontSize: 15, color: c.text2 }}>
                {'ערוך, הוסף או הסר שירותים לפי הצורך'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {config.services.map((service, idx) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  index={idx}
                  onChange={(updated) =>
                    setConfig((p) => ({
                      ...p,
                      services: p.services.map((s, i) => (i === idx ? updated : s)),
                    }))
                  }
                  onDelete={() =>
                    setConfig((p) => ({
                      ...p,
                      services: p.services.filter((_, i) => i !== idx),
                    }))
                  }
                />
              ))}

              <Button
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    services: [
                      ...p.services,
                      {
                        id: 'svc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                        name: '',
                        pricingType: 'fixed',
                        defaultPrice: '',
                        whatToAsk: '',
                      },
                    ],
                  }))
                }
                fullWidth
                sx={{
                  py: 2,
                  borderRadius: 3,
                  border: `2px dashed ${c.border2}`,
                  color: c.text2,
                  fontWeight: 700,
                  fontSize: 14,
                  textTransform: 'none',
                  '&:hover': { borderColor: c.accent, color: c.accent, bgcolor: c.accentDim },
                }}
              >
                {'+ הוסף שירות'}
              </Button>
            </Box>
          </Box>
        )}

        {/* ====== STEP 3: Appointment Style ====== */}
        {step === 3 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: c.accentDim,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {'📅'}
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1 }}>
                {'איך לטפל בפגישות?'}
              </Typography>
              <Typography sx={{ fontSize: 15, color: c.text2 }}>
                {'בחר את הדרך שעובדת הכי טוב בשבילך'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                {
                  id: 'schedule',
                  icon: '⚡',
                  title: 'דנה קובעת מועד בשיחה',
                  desc: 'דנה בודקת זמינות ביומן שלך, מציעה ללקוח חלונות פנויים, ומאשרת מועד בזמן אמת. הכי מהיר.',
                  recommended: true,
                },
                {
                  id: 'collect',
                  icon: '📋',
                  title: 'דנה אוספת פרטים, אתה חוזר',
                  desc: 'דנה מתשאלת את הלקוח ושולחת אליך סיכום. אתה מחזיר טלפון בנוחיות שלך.',
                },
                {
                  id: 'qa_only',
                  icon: '💬',
                  title: 'דנה רק עונה על שאלות',
                  desc: 'דנה משיבה על שאלות נפוצות בלי לקבוע מועדים. מתאים לעסקים שמעדיפים שיחה ישירה.',
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
                    bgcolor: config.appointmentHandling === option.id ? c.accentDim : c.surface1,
                    border: `2px solid ${config.appointmentHandling === option.id ? c.accent : c.border}`,
                    borderRadius: 4,
                    p: 3,
                    display: 'flex',
                    gap: 2.5,
                    transition: 'all 0.2s',
                    position: 'relative',
                    '&:hover': { borderColor: c.accent2, transform: 'translateY(-1px)' },
                  }}
                >
                  {option.recommended && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: 16,
                        bgcolor: c.accent,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 99,
                      }}
                    >
                      {'★ הכי פופולרי'}
                    </Box>
                  )}
                  <Box sx={{ fontSize: 36 }}>{option.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: c.text, mb: 0.5 }}>
                      {option.title}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: c.text2, lineHeight: 1.65 }}>
                      {option.desc}
                    </Typography>
                  </Box>
                  {config.appointmentHandling === option.id && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
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
                      {'✓'}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ====== STEP 4: Voice ====== */}
        {step === 4 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: c.accentDim,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {'🎙️'}
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1 }}>
                {'בחר את הקול של דנה'}
              </Typography>
              <Typography sx={{ fontSize: 15, color: c.text2 }}>
                {'5 קולות עבריים מבית ElevenLabs'}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {VOICES.map((v) => (
                <Box
                  key={v.id}
                  onClick={() => setConfig((p) => ({ ...p, voiceId: v.id, voiceName: v.name }))}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: c.surface1,
                    border: `2px solid ${config.voiceId === v.id ? c.accent : c.border}`,
                    borderRadius: 3,
                    p: 2.5,
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    position: 'relative',
                    '&:hover': { transform: 'translateY(-2px)' },
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
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                      }}
                    >
                      {'✓'}
                    </Box>
                  )}
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: v.color,
                      color: '#fff',
                      fontSize: 24,
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
                  <Typography sx={{ fontSize: 15, fontWeight: 800, color: c.text }}>
                    {v.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: c.text3, mt: 0.5 }}>
                    {v.desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ====== STEP 5: Personality ====== */}
        {step === 5 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: c.accentDim,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {'💬'}
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1 }}>
                {'איך דנה מתחילה שיחה?'}
              </Typography>
              <Typography sx={{ fontSize: 15, color: c.text2 }}>
                {'התאם את הפתיחה ומה לאסוף'}
              </Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: c.text2, mb: 1 }}>
                {'משפט פתיחה'}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={config.greeting}
                onChange={(e) => setConfig((p) => ({ ...p, greeting: e.target.value }))}
                sx={{ '& textarea': { fontSize: 15, lineHeight: 1.6 } }}
              />
              <Typography sx={{ fontSize: 11, color: c.text3, mt: 1 }}>
                {'זה מה ש'}{config.voiceName}{' תגיד בתחילת כל שיחה'}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: c.text2, mb: 1.5 }}>
                {'מה דנה צריכה לאסוף מהלקוח?'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                {[
                  { id: 'fullName', label: 'שם מלא', icon: '👤' },
                  { id: 'phone', label: 'מספר טלפון', icon: '📞' },
                  { id: 'reason', label: 'סיבת הפנייה', icon: '❓' },
                  { id: 'service', label: 'שירות מבוקש', icon: '🛠️' },
                  { id: 'preferredDate', label: 'תאריך מועדף', icon: '📅' },
                  { id: 'notes', label: 'הערות נוספות', icon: '📝' },
                ].map((field) => {
                  const isOn = config.fieldsToCollect[field.id as keyof typeof config.fieldsToCollect];
                  return (
                    <Box
                      key={field.id}
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          fieldsToCollect: { ...p.fieldsToCollect, [field.id]: !isOn },
                        }))
                      }
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isOn ? c.accentDim : c.surface1,
                        border: `2px solid ${isOn ? c.accent : c.border2}`,
                        borderRadius: 2.5,
                        p: 1.75,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        transition: 'all 0.15s',
                      }}
                    >
                      <Box sx={{ fontSize: 18 }}>{field.icon}</Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: c.text, flex: 1 }}>
                        {field.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          bgcolor: isOn ? c.accent : c.surface4,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                        }}
                      >
                        {isOn ? '✓' : ''}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        {/* ====== STEP 6: Review ====== */}
        {step === 6 && (
          <Box className="zk-fade-up">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: c.accentDim,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {'✨'}
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1 }}>
                {'בדיקה אחרונה'}
              </Typography>
              <Typography sx={{ fontSize: 15, color: c.text2 }}>
                {'הכל מוכן? בוא נצור את הסוכן שלך'}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: c.surface1, border: `1px solid ${c.border}`, borderRadius: 4, p: 4 }}>
              {[
                { label: 'עסק', value: config.businessName, icon: '🏢' },
                { label: 'איש קשר', value: config.contactName, icon: '👤' },
                { label: 'תחום', value: config.industry || '—', icon: '🎯' },
                { label: 'קול', value: config.voiceName, icon: '🎙️' },
                {
                  label: 'סגנון',
                  value:
                    config.appointmentHandling === 'schedule'
                      ? 'קביעת מועד בשיחה'
                      : config.appointmentHandling === 'collect'
                      ? 'איסוף וחזרה'
                      : 'שאלות ותשובות',
                  icon: '⚡',
                },
              ].map((row, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.5,
                    borderBottom: i < 4 ? `1px solid ${c.border}` : 'none',
                  }}
                >
                  <Box sx={{ fontSize: 22 }}>{row.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600 }}>
                      {row.label}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: c.text, fontWeight: 700 }}>
                      {row.value}
                    </Typography>
                  </Box>
                </Box>
              ))}

              <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid ${c.border}` }}>
                <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600, mb: 1.5 }}>
                  {'שירותים ('}{config.services.length}{')'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {config.services.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.name}
                      size="small"
                      sx={{ bgcolor: c.accentDim, color: c.accent, fontWeight: 700 }}
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid ${c.border}` }}>
                <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 600, mb: 1 }}>
                  {'משפט פתיחה'}
                </Typography>
                <Typography sx={{ fontSize: 13, color: c.text, fontStyle: 'italic', lineHeight: 1.6 }}>
                  {'"'}{config.greeting}{'"'}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* ====== STEP 7: Provisioning ====== */}
        {step === 7 && (
          <Box
            className="zk-fade-up"
            sx={{
              textAlign: 'center',
              minHeight: '60vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ fontSize: 80, mb: 3 }}>{'🚀'}</Box>
            <Typography sx={{ fontSize: 32, fontWeight: 800, color: c.text, mb: 1 }}>
              {'בונים את הסוכן שלך'}
            </Typography>
            <Typography sx={{ fontSize: 15, color: c.text2, mb: 4 }}>
              {'זה ייקח כ-30 שניות'}
            </Typography>

            {errorMsg && (
              <Box
                sx={{
                  bgcolor: c.hotDim,
                  border: `1px solid ${c.hot}`,
                  borderRadius: 3,
                  p: 2.5,
                  mb: 3,
                  maxWidth: 460,
                  mx: 'auto',
                }}
              >
                <Typography sx={{ fontSize: 13, color: c.hot, fontWeight: 600 }}>{errorMsg}</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 420, mx: 'auto' }}>
              {[
                'יוצר סוכן AI מותאם אישית',
                'מקצה מספר טלפון ייעודי',
                'מחבר את הקול של ' + config.voiceName,
                'משלים הגדרות אחרונות',
              ].map((stepName, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: c.surface1,
                    borderRadius: 2.5,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  {provisioning ? (
                    <CircularProgress size={18} sx={{ color: c.accent }} />
                  ) : (
                    <Box sx={{ color: c.text3, fontSize: 18 }}>{'○'}</Box>
                  )}
                  <Typography sx={{ fontSize: 14, color: c.text, fontWeight: 600 }}>
                    {stepName}
                  </Typography>
                </Box>
              ))}
            </Box>

            {!provisioning && (
              <Button
                onClick={submitToServer}
                variant="contained"
                size="large"
                sx={{
                  mt: 4,
                  py: 2,
                  fontSize: 16,
                  fontWeight: 800,
                  borderRadius: 3,
                  maxWidth: 420,
                  mx: 'auto',
                }}
              >
                {errorMsg ? '🔄 נסה שוב' : '✨ צור את הסוכן'}
              </Button>
            )}
          </Box>
        )}

        {/* ====== STEP 8: Success ====== */}
        {step === 8 && (
          <Box className="zk-fade-up" sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${c.accent}, ${c.accent2})`,
                color: '#fff',
                fontSize: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 20px 50px rgba(79,70,229,0.3)',
              }}
            >
              {'🎉'}
            </Box>
            <Typography sx={{ fontSize: 36, fontWeight: 800, color: c.text, mb: 1 }}>
              {config.voiceName}{' מוכנה!'}
            </Typography>
            <Typography sx={{ fontSize: 16, color: c.text2, mb: 5 }}>
              {'זה המספר שלקוחות יתקשרו אליו 24/7'}
            </Typography>

            <Box
              sx={{
                bgcolor: c.surface1,
                border: `2px solid ${c.accent}`,
                borderRadius: 4,
                p: 4,
                maxWidth: 460,
                mx: 'auto',
                mb: 4,
              }}
            >
              <Typography sx={{ fontSize: 11, color: c.text3, fontWeight: 700, mb: 1, letterSpacing: 1 }}>
                {'מספר הסוכן שלך'}
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
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (config.phoneNumber) navigator.clipboard.writeText(config.phoneNumber);
                  }}
                  sx={{ borderRadius: 3, fontWeight: 600 }}
                >
                  {'📋 העתק'}
                </Button>
                {config.phoneNumber && (
                  <Button
                    variant="contained"
                    href={`tel:${config.phoneNumber}`}
                    sx={{ borderRadius: 3, fontWeight: 700 }}
                  >
                    {'📞 התקשר עכשיו'}
                  </Button>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: c.accentDim,
                border: `1px solid ${c.accentMid}`,
                borderRadius: 3,
                p: 3,
                maxWidth: 460,
                mx: 'auto',
                mb: 4,
                textAlign: 'right',
              }}
            >
              <Typography sx={{ fontSize: 14, color: c.accent, fontWeight: 800, mb: 1.5 }}>
                {'💡 רוצה לבדוק שזה עובד?'}
              </Typography>
              <Typography sx={{ fontSize: 13, color: c.text2, lineHeight: 1.7 }}>
                {'1. התקשר למספר למעלה'}<br />
                {'2. שוחח עם '}{config.voiceName}{' כאילו אתה לקוח'}<br />
                {'3. כל השיחה תופיע בדאשבורד שלך עם סיכום AI מלא'}
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/dashboard')}
              sx={{ py: 2, px: 6, fontSize: 16, fontWeight: 800, borderRadius: 3 }}
            >
              {'עבור לדאשבורד →'}
            </Button>
          </Box>
        )}

        {/* ====== Navigation Bar ====== */}
        {step >= 1 && step <= 6 && (
          <Box sx={{ display: 'flex', gap: 2, mt: 6, maxWidth: 480, mx: 'auto' }}>
            {step > 1 && (
              <Button
                onClick={back}
                fullWidth
                variant="outlined"
                sx={{ py: 1.75, borderRadius: 3, fontWeight: 700 }}
              >
                {'← חזרה'}
              </Button>
            )}
            <Button
              onClick={step === 6 ? () => setStep(7) : next}
              disabled={!canProceed()}
              fullWidth
              variant="contained"
              sx={{ py: 1.75, borderRadius: 3, fontWeight: 800, fontSize: 15 }}
            >
              {step === 6 ? 'אישור והמשך ✓' : 'המשך →'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ====================================================================
// Service Card Component
// ====================================================================
function ServiceCard({
  service,
  index,
  onChange,
  onDelete,
}: {
  service: BusinessService;
  index: number;
  onChange: (s: BusinessService) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        bgcolor: c.surface1,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${c.accent}`,
        borderRadius: 3,
        p: 2.5,
        position: 'relative',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: expanded ? 2 : 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: c.accentDim,
            color: c.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {index + 1}
        </Box>
        <TextField
          placeholder="שם השירות"
          value={service.name}
          onChange={(e) => onChange({ ...service, name: e.target.value })}
          variant="standard"
          fullWidth
          InputProps={{ disableUnderline: true, sx: { fontWeight: 700, fontSize: 15 } }}
        />
        <IconButton onClick={() => setExpanded(!expanded)} sx={{ color: c.text3 }}>
          {expanded ? '▲' : '▼'}
        </IconButton>
        <IconButton onClick={onDelete} sx={{ color: c.hot }}>
          {'✕'}
        </IconButton>
      </Box>

      {expanded && (
        <Box className="zk-fade-up" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: c.text2, mb: 0.5 }}>
              {'תמחור'}
            </Typography>
            <Select
              fullWidth
              size="small"
              value={service.pricingType}
              onChange={(e) =>
                onChange({
                  ...service,
                  pricingType: e.target.value as 'fixed' | 'variable' | 'quote',
                })
              }
            >
              <MenuItem value="fixed">{'מחיר קבוע'}</MenuItem>
              <MenuItem value="variable">{'מחיר משתנה (לפי גודל/כמות)'}</MenuItem>
              <MenuItem value="quote">{'הצעת מחיר מותאמת'}</MenuItem>
            </Select>
          </Box>

          {service.pricingType !== 'quote' && (
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: c.text2, mb: 0.5 }}>
                {'מחיר התחלתי (₪)'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                placeholder="500"
                value={service.defaultPrice}
                onChange={(e) => onChange({ ...service, defaultPrice: e.target.value })}
              />
            </Box>
          )}

          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: c.text2, mb: 0.5 }}>
              {'מה דנה צריכה לשאול?'}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="לדוגמה: כמה חדרים, איזה סוג רצפה, מתי האחרון שבוצע ניקיון..."
              value={service.whatToAsk}
              onChange={(e) => onChange({ ...service, whatToAsk: e.target.value })}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
