'use client';
import { useL } from '@/hooks/useL';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, Card, CardContent, Switch, Select, MenuItem } from '@mui/material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { DataTable } from '@/components/ui/DataTable';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatTime } from '@/lib/formatters';
import { getGeoLabels } from '@/lib/geo';
import type { BotConfig, BotFlow, BotVoice, BotSimulation, FollowUpConfig, BotLogEntry } from '@/types';
import type { TwilioConfig, ServiceArea, BusinessRegion } from '@/types/config';

type TabKey = 'config' | 'phone' | 'flows' | 'email' | 'simulator' | 'log' | 'followups' | 'setup';

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'config', icon: '⚙️', label: 'הגדרות' },
  { key: 'phone', icon: '📞', label: 'טלפון' },
  { key: 'flows', icon: '🔀', label: 'תהליכים' },
  { key: 'email', icon: '📧', label: 'Email' },
  { key: 'simulator', icon: '🧪', label: 'סימולטור' },
  { key: 'log', icon: '📋', label: 'יומן שיחות' },
  { key: 'followups', icon: '🔔', label: 'מעקבים' },
  { key: 'setup', icon: '📖', label: 'מדריך' },
];

const VOICES: { key: BotVoice; label: string; desc: string }[] = [
  { key: 'alloy', label: 'Alloy', desc: 'מאוזן, מקצועי' },
  { key: 'echo', label: 'Echo', desc: 'חם, ידידותי' },
  { key: 'nova', label: 'Nova', desc: 'אנרגטי, עליז' },
  { key: 'shimmer', label: 'Shimmer', desc: 'רך, מרגיע' },
  { key: 'onyx', label: 'Onyx', desc: 'עמוק, סמכותי' },
];

const defaultBot: BotConfig = {
  enabled: false, voice: 'alloy',
  greeting: 'Hello! Thank you for calling. How can I help you today?',
  serviceFee: '', promotions: '', talkingPoints: '', webhookUrl: '',
  emailNotifications: false, notifyEmail: '',
  followUps: { enabled: false, smsAfterCall: false, emailAfterCall: false, noAnswerRetry: false, noAnswerRetryHours: 4, partsArrivedNotify: false },
  flows: [],
};

function CardHeader({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <Box className="zk-fade-up" sx={{ p: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <Typography sx={{ fontFamily: "'Rubik', sans-serif", fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', letterSpacing: '-0.2px' }}>
        {icon} {title}
      </Typography>
      {action}
    </Box>
  );
}

export default function AIBotPage() {
  const { db, cfg, saveCfg, saveData, bizId: dataBizId } = useData();
  const L = useL();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('config');

  // Bot config state — merge stored with defaults
  const stored = (cfg as Record<string, unknown>).botConfig as BotConfig | undefined;
  const [bot, setBot] = useState<BotConfig>({ ...defaultBot, ...stored });

  // Flow editor
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [editFlow, setEditFlow] = useState<Partial<BotFlow>>({});

  // Simulator
  const [simInput, setSimInput] = useState('');
  const [simHistory, setSimHistory] = useState<BotSimulation[]>([]);

  // Phone / Twilio config — Master Account (no SID/token per business!)
  const region: BusinessRegion = (cfg.region as BusinessRegion) || 'US';
  const geoLabels = getGeoLabels(region);
  const storedTwilio = cfg.twilio as TwilioConfig | undefined;
  const [twilioPhone, setTwilioPhone] = useState(storedTwilio?.phoneNumber || '');
  const [twilioEnabled, setTwilioEnabled] = useState(storedTwilio?.enabled || false);
  const [phoneSid, setPhoneSid] = useState(storedTwilio?.phoneSid || '');
  const [phoneStatus, setPhoneStatus] = useState<string>(storedTwilio?.status || '');
  const [provisioning, setProvisioning] = useState(false);
  const [areaCodeInput, setAreaCodeInput] = useState('');
  const storedArea = cfg.serviceArea as ServiceArea | undefined;
  const [serviceAreaInput, setServiceAreaInput] = useState(storedArea?.values?.join(', ') || '');
  const [businessHoursInput, setBusinessHoursInput] = useState(cfg.businessHours || '');

  const botLog = db.botLog || [];

  const saveBotConfig = async (patch: Partial<BotConfig>) => {
    const updated = { ...bot, ...patch };
    setBot(updated);
    await saveCfg({ ...cfg, botConfig: updated } as Record<string, unknown> as typeof cfg);
    toast('✅ Bot config saved!');
  };

  // ── Flow CRUD ──
  const openNewFlow = () => {
    setEditFlow({ name: '', trigger: '', response: '', action: '' });
    setShowFlowModal(true);
  };

  const openEditFlow = (flow: BotFlow) => {
    setEditFlow({ ...flow });
    setShowFlowModal(true);
  };

  const handleSaveFlow = async () => {
    if (!editFlow.name?.trim() || !editFlow.trigger?.trim()) { toast('Name and trigger are required', '#ff4d6d'); return; }
    const flows = [...(bot.flows || [])];
    if (editFlow.id) {
      const idx = flows.findIndex((f) => f.id === editFlow.id);
      if (idx >= 0) flows[idx] = editFlow as BotFlow;
    } else {
      flows.push({ ...editFlow, id: 'flow_' + Date.now() } as BotFlow);
    }
    await saveBotConfig({ flows });
    setShowFlowModal(false);
  };

  const handleDeleteFlow = async (flow: BotFlow) => {
    if (!confirm('למחוק את התהליך "' + flow.name + '"?')) return;
    await saveBotConfig({ flows: (bot.flows || []).filter((f) => f.id !== flow.id) });
  };

  // ── Simulator ──
  const handleSimulate = () => {
    if (!simInput.trim()) return;
    const input = simInput.toLowerCase();
    let response = '';
    let matchedFlow = '';

    // Detect language from business config
    const isHe = cfg.lang === 'he' || cfg.region === 'IL';
    const bizName = cfg.biz_name || (isHe ? 'העסק שלנו' : 'our business');

    // Check custom flows first
    for (const flow of (bot.flows || [])) {
      if (input.includes(flow.trigger.toLowerCase())) {
        response = flow.response;
        matchedFlow = flow.name;
        break;
      }
    }

    // Built-in keyword responses — bilingual
    if (!response && (input.includes('price') || input.includes('cost') || input.includes('fee') || input.includes('כמה') || input.includes('מחיר') || input.includes('עולה'))) {
      response = isHe
        ? (bot.serviceFee ? `דמי ביקור טכנאי מתחילים מ-${bot.serviceFee}. רוצה לקבוע תור?` : `אשמח לתת לך הצעת מחיר. מה שמך ומה כתובתך?`)
        : (bot.serviceFee ? `Our service fee starts at ${bot.serviceFee}. Would you like to schedule an appointment?` : 'I can have someone get back to you with pricing. Can I get your name and phone number?');
    }
    if (!response && (input.includes('promo') || input.includes('deal') || input.includes('special') || input.includes('מבצע') || input.includes('הנחה'))) {
      response = isHe
        ? (bot.promotions ? `מבצע נוכחי: ${bot.promotions}` : 'כרגע אין מבצעים מיוחדים, אבל אשמח לתאם ייעוץ חינם!')
        : (bot.promotions ? `Current promotion: ${bot.promotions}` : "We don't have any promotions right now, but I can schedule a free consultation!");
    }
    if (!response && (input.includes('schedule') || input.includes('appointment') || input.includes('book') || input.includes('תור') || input.includes('לקבוע') || input.includes('תיאום') || input.includes('פגישה'))) {
      response = isHe
        ? 'אשמח לקבוע לך תור! מה שמך, מספר הטלפון שלך, ומתי נוח לך?'
        : "I'd be happy to schedule an appointment for you! Can I get your name, phone number, and preferred date?";
    }
    if (!response && (input.includes('emergency') || input.includes('urgent') || input.includes('חירום') || input.includes('דחוף') || input.includes('בהול'))) {
      response = isHe
        ? 'אני מבין שזה דחוף. תן לי את הפרטים שלך ואעביר לטכנאי מיד. מה שמך וכתובתך?'
        : "I understand this is urgent. Let me get your details and I'll have a technician contact you right away. What's your name and address?";
    }
    if (!response && (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('שלום') || input.includes('היי') || input.includes('מה נשמע') || input.includes('מה המצב'))) {
      response = bot.greeting || (isHe ? `שלום! תודה שפנית ל${bizName}. איך אפשר לעזור?` : `Hello! Thank you for calling ${bizName}. How can I help you today?`);
    }
    if (!response && (input.includes('hours') || input.includes('open') || input.includes('שעות') || input.includes('פתוח') || input.includes('מתי'))) {
      response = isHe
        ? `אנחנו ב-${bizName} זמינים 24/7 דרך הבוט. טכנאי יחזור אליך בהקדם. מה שמך?`
        : `We're available 24/7 through our AI assistant. A technician will get back to you soon. What's your name?`;
    }
    if (!response && (input.includes('where') || input.includes('location') || input.includes('area') || input.includes('איפה') || input.includes('אזור') || input.includes('איזור'))) {
      response = isHe
        ? 'אנחנו מגיעים לכל האזור. מה הכתובת שלך ואבדוק שאנחנו מכסים?'
        : 'We serve the entire area. What is your address so I can confirm coverage?';
    }

    // Smart fallback — bilingual
    if (!response) {
      response = isHe
        ? `קיבלתי, אני מעביר את הפנייה שלך לצוות. כדי שנוכל לחזור אליך, מה שמך ומספר הטלפון שלך?`
        : `I understand you're asking about "${simInput}". Let me take your details and have someone from our team get back to you. Can I get your name and phone number?`;
    }

    setSimHistory((prev) => [...prev, { input: simInput, response, timestamp: new Date().toISOString(), flow: matchedFlow || undefined }]);
    setSimInput('');
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title={L("AI Voice Bot","בוט קולי AI")} subtitle={L("Configure your AI phone assistant","הגדר את העוזר הטלפוני שלך")} actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge label={bot.enabled ? 'ACTIVE' : 'DISABLED'} variant={bot.enabled ? 'green' : 'grey'} />
      <PageTabs tabs={[{ label: 'בוט AI', href: '/aibot', icon: '🤖' }, { label: 'וואטסאפ', href: '/whatsapp', icon: '💬' }, { label: 'ביקורות', href: '/reviews', icon: '⭐' }]} />
          <Switch checked={bot.enabled} onChange={(e) => saveBotConfig({ enabled: e.target.checked })} size="small" />
        </Box>
      } />

      {/* Tab Navigation */}
      <Box sx={{ display: 'flex', gap: '4px', mb: '16px', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <Button key={t.key} size="small" onClick={() => setTab(t.key)} sx={{
            px: '14px', py: '6px', fontSize: 11, fontWeight: 700, borderRadius: '8px', minWidth: 'auto',
            bgcolor: tab === t.key ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
            color: tab === t.key ? '#4F46E5' : '#78716C',
            border: '1px solid ' + (tab === t.key ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
          }}>
            {t.icon} {t.label}
          </Button>
        ))}
      </Box>

      {/* ══════════ CONFIG TAB ══════════ */}
      {tab === 'config' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Voice Selection */}
          <Card>
            <CardHeader icon="🎙️" title={L("Voice Settings","הגדרות קול")} />
            <CardContent>
              <Label text={L("Select Voice","בחר קול")} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', mb: '16px' }}>
                {VOICES.map((v) => (
                  <Box key={v.key} onClick={() => saveBotConfig({ voice: v.key })} sx={{
                    p: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                    bgcolor: bot.voice === v.key ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid ' + (bot.voice === v.key ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.06)'),
                    transition: 'all 0.2s', '&:hover': { borderColor: 'rgba(0,0,0,0.10)' },
                  }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: '2px', color: bot.voice === v.key ? '#4F46E5' : '#e8f0f4' }}>{v.label}</Typography>
                    <Typography sx={{ fontSize: 10, color: '#78716C' }}>{v.desc}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Greeting & Scripts */}
          <Card>
            <CardHeader icon="💬" title={L("Scripts & Content","תסריטים ותוכן")} />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Box><Label text={L("Greeting Message","הודעת ברכה")} /><TextField fullWidth size="small" multiline rows={3} value={bot.greeting} onChange={(e) => setBot({ ...bot, greeting: e.target.value })} placeholder={L("Hello! Thank you for calling...","שלום! תודה שהתקשרת...")} /></Box>
              <Box><Label text={L("Service Fee","דמי ביקור")} /><TextField fullWidth size="small" value={bot.serviceFee || ''} onChange={(e) => setBot({ ...bot, serviceFee: e.target.value })} placeholder={L("$89 diagnostic fee","₪89 דמי ביקור")} /></Box>
              <Box><Label text={L("Current Promotions","מבצעים נוכחיים")} /><TextField fullWidth size="small" multiline rows={2} value={bot.promotions || ''} onChange={(e) => setBot({ ...bot, promotions: e.target.value })} placeholder={L("10% off for new customers...","10% הנחה ללקוחות חדשים...")} /></Box>
              <Box><Label text={L("Talking Points","נקודות לציין")} /><TextField fullWidth size="small" multiline rows={3} value={bot.talkingPoints || ''} onChange={(e) => setBot({ ...bot, talkingPoints: e.target.value })} placeholder={L("Key points...","נקודות חשובות לבוט...")} /></Box>
              <Button variant="contained" size="small" onClick={() => saveBotConfig({ greeting: bot.greeting, serviceFee: bot.serviceFee, promotions: bot.promotions, talkingPoints: bot.talkingPoints })} sx={{ alignSelf: 'flex-end' }}>
                Save Config
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ══════════ PHONE SETUP TAB ══════════ */}
      {tab === 'phone' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Activate Bot Card */}
          <Card>
            <CardHeader icon="📞" title={L("AI Phone Bot","בוט טלפוני AI")} action={
              <Badge label={twilioPhone ? 'ACTIVE' : 'NOT ACTIVE'} variant={twilioPhone ? 'green' : 'grey'} />
            } />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!twilioPhone ? (
                /* ── Not yet provisioned ── */
                <>
                  <Box sx={{ bgcolor: 'rgba(0,229,176,0.06)', border: '1px solid rgba(79,70,229,0.12)', borderRadius: '12px', p: '18px 20px', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 36, mb: '8px' }}>🤖📞</Typography>
                    <Typography sx={{ fontFamily: "'Rubik', sans-serif", fontSize: 16, fontWeight: 800, mb: '6px' }}>
                      {region === 'IL' ? 'הפעל בוט טלפוני' : 'Activate AI Phone Bot'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#A8A29E', lineHeight: 1.7, maxWidth: 380, mx: 'auto' }}>
                      {region === 'IL'
                        ? 'בלחיצה אחת תקבל מספר טלפון ייעודי לעסק שלך. הבוט יענה לשיחות 24/7, ישאל שאלות חכמות, ויצור לידים אוטומטית.'
                        : 'Get a dedicated phone number for your business with one click. The AI bot will answer calls 24/7, ask smart questions, and create leads automatically.'}
                    </Typography>
                    <Box sx={{ mt: '10px', display: 'flex', gap: '16px', justifyContent: 'center', fontSize: 11, color: '#78716C' }}>
                      <span>📱 {region === 'IL' ? 'מספר +972' : 'US Number'}</span>
                      <span>💰 ~$3/{region === 'IL' ? 'חודש' : 'month'}</span>
                      <span>🤖 AI 24/7</span>
                    </Box>
                  </Box>

                  {!region || region === 'US' ? (
                    <Box><Label text={L("Area Code (optional)","אזור חיוג (אופציונלי)")} />
                      <TextField fullWidth size="small" value={areaCodeInput} onChange={(e) => setAreaCodeInput(e.target.value)}
                        placeholder="e.g. 212 (New York), 310 (LA), 305 (Miami)"
                      />
                      <Typography sx={{ fontSize: 10, color: '#78716C', mt: '4px' }}>{L('Leave blank for any US number','השאר ריק למספר כלשהו')}</Typography>
                    </Box>
                  ) : null}

                  <Button
                    variant="contained"
                    size="large"
                    disabled={provisioning}
                    onClick={async () => {
                      setProvisioning(true);
                      setPhoneStatus('pending');
                      try {
                        const res = await fetch('/api/phone/provision', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            bizId: dataBizId,
                            region: region || 'US',
                            areaCode: areaCodeInput || undefined,
                            bizName: cfg.biz_name || '',
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok || data.error) {
                          throw new Error(data.error || 'Failed to provision');
                        }
                        // Save to config
                        const twilioCfg: TwilioConfig = {
                          phoneNumber: data.phoneNumber,
                          phoneSid: data.phoneSid,
                          enabled: true,
                          provisionedAt: new Date().toISOString(),
                          status: 'active',
                        };
                        setTwilioPhone(data.phoneNumber);
                        setPhoneSid(data.phoneSid);
                        setTwilioEnabled(true);
                        setPhoneStatus('active');
                        await saveCfg({ ...cfg, twilio: twilioCfg } as typeof cfg);
                        toast(`✅ ${data.message}`);
                      } catch (e) {
                        setPhoneStatus('error');
                        toast(`❌ ${(e as Error).message}`);
                      } finally {
                        setProvisioning(false);
                      }
                    }}
                    sx={{
                      py: '14px', fontSize: 15, fontWeight: 800, borderRadius: '14px',
                      background: 'linear-gradient(135deg, #4F46E5, #4F46E5)',
                      color: '#000', boxShadow: '0 8px 24px rgba(79,70,229,0.25)',
                      '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)', boxShadow: '0 12px 32px rgba(0,229,176,0.4)' },
                      '&.Mui-disabled': { opacity: 0.6 },
                    }}
                  >
                    {provisioning ? '⏳ מקצה מספר...' : (region === 'IL' ? '🚀 הפעל בוט עכשיו' : '🚀 Activate Bot Now')}
                  </Button>
                </>
              ) : (
                /* ── Already provisioned ── */
                <>
                  <Box sx={{ bgcolor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '12px', p: '16px 20px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '10px' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                        {region === 'IL' ? 'הבוט פעיל!' : 'Bot is Active!'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <Box sx={{ p: '10px 16px', bgcolor: 'rgba(0,0,0,0.3)', borderRadius: '10px', fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#e8f0f4', letterSpacing: '1px' }}>
                        {twilioPhone}
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <Typography sx={{ fontSize: 11, color: '#A8A29E' }}>
                          {region === 'IL' ? 'המספר הייעודי של העסק' : 'Your dedicated business number'}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: '#78716C' }}>
                          {storedTwilio?.provisionedAt ? `Active since ${new Date(storedTwilio.provisionedAt).toLocaleDateString()}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '12px 16px', bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '10px' }}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{region === 'IL' ? 'בוט פעיל' : 'Bot Enabled'}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#78716C' }}>{region === 'IL' ? 'עונה לשיחות ו-SMS' : 'Answer calls and SMS'}</Typography>
                    </Box>
                    <Switch checked={twilioEnabled} onChange={async (e) => {
                      setTwilioEnabled(e.target.checked);
                      await saveCfg({
                        ...cfg,
                        twilio: { ...storedTwilio, enabled: e.target.checked },
                      } as typeof cfg);
                      toast(e.target.checked ? '✅ Bot enabled' : '⏸️ Bot paused');
                    }} size="small" />
                  </Box>

                  {/* Danger zone — release number */}
                  <Box sx={{ mt: '8px', p: '12px 16px', bgcolor: 'rgba(255,77,109,0.04)', border: '1px solid rgba(255,77,109,0.1)', borderRadius: '10px' }}>
                    <Typography sx={{ fontSize: 11, color: '#ff4d6d', mb: '8px' }}>
                      ⚠️ {region === 'IL' ? 'שחרור מספר — פעולה בלתי הפיכה!' : 'Release Number — This cannot be undone!'}
                    </Typography>
                    <Button variant="outlined" size="small" color="error" onClick={async () => {
                      if (!confirm(region === 'IL' ? 'בטוח? המספר ישוחרר ולא יחזור!' : 'Are you sure? This number will be released permanently!')) return;
                      try {
                        const res = await fetch('/api/phone/release', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bizId: dataBizId, phoneSid, phoneNumber: twilioPhone }),
                        });
                        if (res.ok) {
                          setTwilioPhone('');
                          setPhoneSid('');
                          setTwilioEnabled(false);
                          setPhoneStatus('');
                          await saveCfg({ ...cfg, twilio: { status: 'released' } } as typeof cfg);
                          toast('📞 Number released');
                        }
                      } catch { toast('❌ Failed to release'); }
                    }} sx={{ fontSize: 10, textTransform: 'none' }}>
                      {region === 'IL' ? '🗑️ שחרר מספר' : '🗑️ Release Number'}
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {/* Service Area */}
          <Card>
            <CardHeader icon="🗺️" title={geoLabels.serviceArea} />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Box><Label text={region === 'IL' ? 'ערים / אזורים' : 'ZIP Codes or Cities'} />
                <TextField fullWidth size="small" multiline rows={2} value={serviceAreaInput} onChange={(e) => setServiceAreaInput(e.target.value)}
                  placeholder={geoLabels.serviceAreaPlaceholder} />
                <Typography sx={{ fontSize: 10, color: '#78716C', mt: '4px' }}>
                  {region === 'IL' ? 'הפרד בפסיקים: תל אביב, רמת גן, גבעתיים' : 'Separate with commas: 10001, 10002 or Manhattan, Brooklyn'}
                </Typography>
              </Box>

              <Box><Label text={geoLabels.businessHours} />
                <TextField fullWidth size="small" value={businessHoursInput} onChange={(e) => setBusinessHoursInput(e.target.value)}
                  placeholder={geoLabels.businessHoursPlaceholder} />
              </Box>

              <Button variant="contained" size="small" onClick={async () => {
                const values = serviceAreaInput.split(',').map((s) => s.trim()).filter(Boolean);
                await saveCfg({
                  ...cfg,
                  serviceArea: { type: region === 'IL' ? 'city' : 'zip', values, label: serviceAreaInput },
                  businessHours: businessHoursInput,
                } as typeof cfg);
                toast('✅ Service area saved!');
              }} sx={{ alignSelf: 'flex-end' }}>
                Save Service Area
              </Button>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card>
            <CardHeader icon="🔌" title={region === 'IL' ? 'סטטוס חיבור' : 'Connection Status'} />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: region === 'IL' ? 'מספר טלפון' : 'Phone Number', ok: !!twilioPhone, value: twilioPhone || (region === 'IL' ? 'לא הופעל' : 'Not activated') },
                  { label: region === 'IL' ? 'בוט פעיל' : 'Bot Enabled', ok: twilioEnabled && bot.enabled, value: twilioEnabled && bot.enabled ? (region === 'IL' ? 'פעיל' : 'Active') : (region === 'IL' ? 'לא פעיל' : 'Inactive') },
                  { label: geoLabels.serviceArea, ok: serviceAreaInput.length > 0, value: serviceAreaInput || (region === 'IL' ? 'לא הוגדר' : 'Not set') },
                  { label: geoLabels.businessHours, ok: !!businessHoursInput, value: businessHoursInput || (region === 'IL' ? 'לא הוגדר' : 'Not set') },
                  { label: region === 'IL' ? 'ברכת פתיחה' : 'Greeting', ok: !!bot.greeting, value: bot.greeting ? '✅' : (region === 'IL' ? 'לא הוגדר' : 'Not set') },
                  { label: region === 'IL' ? 'סוג עסק' : 'Business Type', ok: !!cfg.biz_type, value: cfg.biz_type || (region === 'IL' ? 'לא הוגדר' : 'Not set') },
                ].map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '8px 12px', bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '8px' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.ok ? '#22c55e' : '#78716C', boxShadow: item.ok ? '0 0 6px #22c55e' : 'none', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: '#A8A29E', flex: 1 }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: item.ok ? '#22c55e' : '#78716C' }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ══════════ FLOWS TAB ══════════ */}
      {tab === 'flows' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: '12px' }}>
            <Button variant="contained" size="small" onClick={openNewFlow}>+ New Flow</Button>
          </Box>

          {(bot.flows || []).length === 0 ? (
            <EmptyState icon="🔀" title="אין תהליכים" subtitle="צור תהליכי שיחה לבוט שלך." actionLabel="+ תהליך חדש" onAction={openNewFlow} />
          ) : (
            <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
              <DataTable<BotFlow>
                keyExtractor={(f) => f.id}
                columns={[
                  { key: 'name', label: 'Flow Name', render: (f) => <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{f.name}</Typography> },
                  { key: 'trigger', label: 'Trigger', render: (f) => <Badge label={f.trigger} variant="blue" /> },
                  { key: 'response', label: 'Response', render: (f) => <Typography sx={{ fontSize: 11, color: '#A8A29E', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.response}</Typography> },
                  { key: 'action', label: 'Action', render: (f) => f.action ? <Badge label={f.action} variant="purple" /> : <Typography sx={{ color: '#78716C', fontSize: 11 }}>—</Typography> },
                  { key: 'actions', label: '', width: 100, render: (f) => (
                    <Box sx={{ display: 'flex', gap: '4px' }}>
                      <Button size="small" onClick={() => openEditFlow(f)} sx={{ fontSize: 10, minWidth: 'auto', p: '2px 8px', bgcolor: 'rgba(0,0,0,0.03)', color: '#A8A29E', borderRadius: '6px' }}>✏️</Button>
                      <Button size="small" onClick={() => handleDeleteFlow(f)} sx={{ fontSize: 10, minWidth: 'auto', p: '2px 8px', bgcolor: 'rgba(255,77,109,0.08)', color: '#ff4d6d', borderRadius: '6px' }}>🗑️</Button>
                    </Box>
                  )},
                ]}
                data={bot.flows || []}
                onRowClick={openEditFlow}
              />
            </Box>
          )}

          {/* Flow Modal */}
          <ModalBase open={showFlowModal} onClose={() => setShowFlowModal(false)} title={editFlow.id ? 'עריכת תהליך' : 'תהליך חדש'}
            footer={<>
              <Button variant="outlined" size="small" onClick={() => setShowFlowModal(false)}>{L('Cancel','ביטול')}</Button>
              <Button variant="contained" size="small" onClick={handleSaveFlow}>{editFlow.id ? 'עדכן' : 'Create Flow'}</Button>
            </>}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Box><Label text={L("Flow Name *","שם תהליך *")} /><TextField fullWidth size="small" value={editFlow.name || ''} onChange={(e) => setEditFlow({ ...editFlow, name: e.target.value })} placeholder={L("Schedule Appointment","קביעת תור")} /></Box>
              <Box><Label text={L("Trigger Keyword *","מילת טריגר *")} /><TextField fullWidth size="small" value={editFlow.trigger || ''} onChange={(e) => setEditFlow({ ...editFlow, trigger: e.target.value })} placeholder="schedule, appointment, book" /></Box>
              <Box><Label text={L("Bot Response","תשובת הבוט")} /><TextField fullWidth size="small" multiline rows={3} value={editFlow.response || ''} onChange={(e) => setEditFlow({ ...editFlow, response: e.target.value })} placeholder="אשמח לקבוע תור..." /></Box>
              <Box><Label text={L("Action (optional)","פעולה (אופציונלי)")} /><TextField fullWidth size="small" value={editFlow.action || ''} onChange={(e) => setEditFlow({ ...editFlow, action: e.target.value })} placeholder={L("create_lead, send_sms","create_lead, send_sms")} /></Box>
            </Box>
          </ModalBase>
        </Box>
      )}

      {/* ══════════ EMAIL TAB ══════════ */}
      {tab === 'email' && (
        <Card>
          <CardHeader icon="📧" title={L("Email Notifications","התראות מייל")} />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '12px 16px', bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '10px' }}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{L("Email Notifications","התראות מייל")}</Typography>
                <Typography sx={{ fontSize: 11, color: '#78716C' }}>{L("Get notified when the bot receives calls","קבל התראה כשהבוט מקבל שיחות")}</Typography>
              </Box>
              <Switch checked={bot.emailNotifications || false} onChange={(e) => setBot({ ...bot, emailNotifications: e.target.checked })} size="small" />
            </Box>

            {bot.emailNotifications && (
              <>
                <Box><Label text={L("Notification Email","מייל התראות")} /><TextField fullWidth size="small" type="email" value={bot.notifyEmail || ''} onChange={(e) => setBot({ ...bot, notifyEmail: e.target.value })} placeholder={L("you@business.com","you@business.com")} /></Box>
                <Box><Label text={L("Webhook URL (optional)","Webhook URL (אופציונלי)")} /><TextField fullWidth size="small" value={bot.webhookUrl || ''} onChange={(e) => setBot({ ...bot, webhookUrl: e.target.value })} placeholder="https://hooks.zapier.com/..." /></Box>
              </>
            )}

            <Button variant="contained" size="small" onClick={() => saveBotConfig({ emailNotifications: bot.emailNotifications, notifyEmail: bot.notifyEmail, webhookUrl: bot.webhookUrl })} sx={{ alignSelf: 'flex-end' }}>
              Save Email Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════ SIMULATOR TAB ══════════ */}
      {tab === 'simulator' && (
        <Card>
          <CardHeader icon="🧪" title={L("Bot Simulator","סימולטור בוט")} action={
            simHistory.length > 0 ? <Button size="small" onClick={() => setSimHistory([])} sx={{ fontSize: 10, color: '#78716C' }}>{L("Clear","נקה")}</Button> : null
          } />
          <CardContent>
            <Box sx={{ minHeight: 300, maxHeight: 400, overflowY: 'auto', mb: '16px', p: '12px', bgcolor: '#FAF7F4', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
              {simHistory.length === 0 ? (
                <Typography sx={{ textAlign: 'center', color: '#78716C', fontSize: 12, py: 6 }}>{L("Type a message to test the bot","הקלד הודעה לבדיקת הבוט")}</Typography>
              ) : (
                simHistory.map((sim, i) => (
                  <Box key={i} sx={{ mb: '12px' }}>
                    {/* User message */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: '6px' }}>
                      <Box sx={{ maxWidth: '70%', bgcolor: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '12px 12px 4px 12px', p: '8px 12px' }}>
                        <Typography sx={{ fontSize: 12 }}>{sim.input}</Typography>
                        <Typography sx={{ fontSize: 9, color: '#78716C', mt: '2px' }}>{formatTime(sim.timestamp)}</Typography>
                      </Box>
                    </Box>
                    {/* Bot response */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: '4px' }}>
                      <Box sx={{ maxWidth: '70%', bgcolor: 'rgba(79,143,255,0.1)', border: '1px solid rgba(79,143,255,0.2)', borderRadius: '12px 12px 12px 4px', p: '8px 12px' }}>
                        <Typography sx={{ fontSize: 12 }}>🤖 {sim.response}</Typography>
                        {sim.flow && <Typography sx={{ fontSize: 9, color: '#a78bfa', mt: '2px' }}>Flow: {sim.flow}</Typography>}
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: '8px' }}>
              <TextField fullWidth size="small" value={simInput} onChange={(e) => setSimInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSimulate(); }}
                placeholder={L("Type a caller question...","הקלד שאלת לקוח...")} />
              <Button variant="contained" size="small" onClick={handleSimulate} sx={{ minWidth: 80 }}>{L("Send","שלח")}</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ══════════ CALL LOG TAB ══════════ */}
      {tab === 'log' && (
        <Card>
          <CardHeader icon="📋" title={L("Call Log","יומן שיחות")} action={
            <Badge label={botLog.length + ' entries'} variant="accent" />
          } />
          <CardContent sx={{ p: '0 !important' }}>
            {botLog.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, color: '#78716C' }}>No bot activity yet. Calls will appear here.</Typography>
              </Box>
            ) : (
              <DataTable<BotLogEntry>
                keyExtractor={(e) => e.time + e.msg}
                columns={[
                  { key: 'time', label: 'Time', render: (e) => <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#78716C' }}>{e.time}</Typography>, width: 140 },
                  { key: 'type', label: 'סוג', render: (e) => <Badge label={e.type || 'call'} variant={e.type === 'missed' ? 'hot' : e.type === 'answered' ? 'green' : 'blue'} />, width: 100 },
                  { key: 'msg', label: 'Message', render: (e) => <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>{e.msg}</Typography> },
                ]}
                data={[...botLog].reverse()}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════ FOLLOW-UPS TAB ══════════ */}
      {tab === 'followups' && (
        <Card>
          <CardHeader icon="🔔" title={L("Follow-up Settings","הגדרות מעקב")} />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'enabled' as const, label: 'Enable Auto Follow-ups', desc: 'Automatically follow up after calls' },
              { key: 'smsAfterCall' as const, label: 'SMS After Call', desc: 'Send SMS summary after each call' },
              { key: 'emailAfterCall' as const, label: 'Email After Call', desc: 'Send email summary after each call' },
              { key: 'noAnswerRetry' as const, label: 'Retry No-Answer', desc: 'Automatically retry missed calls' },
              { key: 'partsArrivedNotify' as const, label: 'Parts Arrived Notification', desc: 'Notify customer when parts arrive' },
            ].map((item) => (
              <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '12px 16px', bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '10px' }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#78716C' }}>{item.desc}</Typography>
                </Box>
                <Switch checked={bot.followUps[item.key] || false} onChange={(e) => {
                  const updated = { ...bot.followUps, [item.key]: e.target.checked };
                  setBot({ ...bot, followUps: updated });
                }} size="small" />
              </Box>
            ))}

            {bot.followUps.noAnswerRetry && (
              <Box sx={{ pl: '16px' }}>
                <Label text={L("Retry After (hours)","נסה שוב אחרי (שעות)")} />
                <TextField size="small" type="number" value={bot.followUps.noAnswerRetryHours} onChange={(e) => {
                  const updated = { ...bot.followUps, noAnswerRetryHours: parseInt(e.target.value) || 4 };
                  setBot({ ...bot, followUps: updated });
                }} sx={{ maxWidth: 120 }} />
              </Box>
            )}

            <Button variant="contained" size="small" onClick={() => saveBotConfig({ followUps: bot.followUps })} sx={{ alignSelf: 'flex-end' }}>
              Save Follow-up Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════ SETUP GUIDE TAB ══════════ */}
      {tab === 'setup' && (
        <Card>
          <CardHeader icon="📖" title="מדריך הגדרה" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { step: 1, icon: '🎙️', title: 'Choose a Voice', desc: 'Go to the Config tab and select a voice that matches your brand.', done: !!bot.voice },
                { step: 2, icon: '💬', title: 'Set Your Greeting', desc: 'Write a greeting message that welcomes callers.', done: !!bot.greeting && bot.greeting !== defaultBot.greeting },
                { step: 3, icon: '💰', title: 'הוסף עלות שירות', desc: 'הכנס את עלות השירות/אבחון כדי שהבוט יוכל לעדכן מתקשרים.', done: !!bot.serviceFee },
                { step: 4, icon: '🔀', title: 'Create Flows', desc: 'Build conversation flows for common caller questions.', done: (bot.flows || []).length > 0 },
                { step: 5, icon: '📧', title: 'Setup Email Notifications', desc: 'Get notified when the bot handles calls.', done: !!bot.emailNotifications },
                { step: 6, icon: '🔔', title: 'Configure Follow-ups', desc: 'Enable auto follow-ups for missed calls and SMS.', done: bot.followUps.enabled },
                { step: 7, icon: '🧪', title: 'Test Your Bot', desc: 'Use the Simulator tab to test different caller scenarios.', done: false },
                { step: 8, icon: '📞', title: region === 'IL' ? 'הפעל בוט טלפוני' : 'Activate Phone Bot', desc: region === 'IL' ? 'לחץ "הפעל בוט" בטאב Phone Setup.' : 'Click "Activate Bot" in Phone Setup tab.', done: !!twilioPhone },
                { step: 9, icon: '🗺️', title: 'Set Service Area', desc: 'Define which areas your business covers.', done: serviceAreaInput.length > 0 },
                { step: 10, icon: '✅', title: 'Enable the Bot', desc: 'Toggle the bot ON at the top of this page when ready.', done: bot.enabled },
              ].map((item) => (
                <Box key={item.step} sx={{
                  display: 'flex', alignItems: 'center', gap: '14px', p: '14px 16px',
                  bgcolor: item.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.025)',
                  border: '1px solid ' + (item.done ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.06)'),
                  borderRadius: '12px',
                }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: item.done ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.03)', fontSize: 16, flexShrink: 0,
                  }}>
                    {item.done ? '✅' : item.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: item.done ? '#22c55e' : '#e8f0f4' }}>
                      Step {item.step}: {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#78716C', lineHeight: 1.5 }}>{item.desc}</Typography>
                  </Box>
                  <Badge label={item.done ? 'Done' : 'Pending'} variant={item.done ? 'green' : 'grey'} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
