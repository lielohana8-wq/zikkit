'use client';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Select, MenuItem } from '@mui/material';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import { BUSINESS_TYPES } from '@/lib/constants';
import { zikkitColors as c } from '@/styles/theme';

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', mb: '12px', overflow: 'hidden' }}>
      <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
      </Box>
      <Box sx={{ p: '16px 18px' }}>{children}</Box>
    </Box>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: '14px' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '4px' }}>{label}</Typography>
      {children}
    </Box>
  );
}

const inputSx = { '& .MuiOutlinedInput-root': { bgcolor: '#FAF7F4', borderRadius: '10px', fontSize: 13 } };

export default function SettingsPage() {
  const { cfg, saveCfg, db } = useData();
  const { toast } = useToast();
  const { lang, setLang } = useLanguage();

  const [form, setForm] = useState({
    biz_name: '', biz_type: '', biz_phone: '', biz_email: '', biz_address: '',
    currency: 'ILS', tax_rate: 17, quote_footer: '', receipt_footer: '',
    custom_tags: '', monthlyGoal: 0, service_fee: 0, biz_color: '#4F46E5',
    bot_greeting: '',
  });

  useEffect(() => {
    setForm({
      biz_name: cfg.biz_name || '', biz_type: cfg.biz_type || '', biz_phone: cfg.biz_phone || '',
      biz_email: cfg.biz_email || '', biz_address: cfg.biz_address || '',
      currency: cfg.currency || 'ILS', tax_rate: cfg.tax_rate || 17,
      quote_footer: cfg.quote_footer || '', receipt_footer: cfg.receipt_footer || '',
      custom_tags: (cfg.custom_tags || []).join(', '),
      monthlyGoal: (cfg as any).monthlyGoal || 0, service_fee: cfg.service_fee || 0,
      biz_color: cfg.biz_color || '#4F46E5', bot_greeting: (cfg as any).bot_greeting || '',
    });
  }, [cfg]);

  const u = (key: string, val: any) => setForm({ ...form, [key]: val });

  const handleSave = async () => {
    await saveCfg({
      ...cfg, biz_name: form.biz_name, biz_type: form.biz_type, biz_phone: form.biz_phone,
      biz_email: form.biz_email, biz_address: form.biz_address, currency: form.currency,
      tax_rate: form.tax_rate, quote_footer: form.quote_footer, receipt_footer: form.receipt_footer,
      custom_tags: form.custom_tags.split(',').map(x => x.trim()).filter(Boolean),
      monthlyGoal: form.monthlyGoal, service_fee: form.service_fee, biz_color: form.biz_color,
      bot_greeting: form.bot_greeting, setup_done: true,
    });
    toast('✅ הגדרות נשמרו');
  };

  const handleExport = () => {
    const data = { db, cfg, exported: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'zikkit-backup.json'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Box className="zk-fade-up">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '20px' }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>⚙️ הגדרות</Typography>
          <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>הגדר את חשבון Zikkit שלך</Typography>
        </Box>
        <Button variant="contained" onClick={handleSave} sx={{ borderRadius: '10px', px: 3, py: 1, fontSize: 13, fontWeight: 700 }}>💾 שמור הכל</Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '12px' }}>
        {/* Left column */}
        <Box>
          {/* Business info */}
          <Section icon="🏢" title="פרטי העסק">
            <Field label="לוגו"><LogoUpload /></Field>
            <Field label="שם העסק"><TextField fullWidth size="small" value={form.biz_name} onChange={e => u('biz_name', e.target.value)} placeholder="שם העסק שלך" sx={inputSx} /></Field>
            <Field label="סוג עסק">
              <Select fullWidth size="small" value={form.biz_type} onChange={e => u('biz_type', e.target.value)} sx={inputSx}>
                <MenuItem value="">בחר סוג</MenuItem>
                {BUSINESS_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.he || t.label}</MenuItem>)}
              </Select>
            </Field>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Field label="טלפון"><TextField fullWidth size="small" value={form.biz_phone} onChange={e => u('biz_phone', e.target.value)} placeholder="050-0000000" sx={inputSx} /></Field>
              <Field label="מייל"><TextField fullWidth size="small" value={form.biz_email} onChange={e => u('biz_email', e.target.value)} placeholder="info@business.com" sx={inputSx} /></Field>
            </Box>
            <Field label="כתובת"><TextField fullWidth size="small" value={form.biz_address} onChange={e => u('biz_address', e.target.value)} placeholder="רחוב, עיר" sx={inputSx} /></Field>
          </Section>

          {/* Financial */}
          <Section icon="💰" title="כספים">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Field label="מטבע">
                <Select fullWidth size="small" value={form.currency} onChange={e => u('currency', e.target.value)} sx={inputSx}>
                  <MenuItem value="ILS">₪ שקל</MenuItem>
                  <MenuItem value="USD">$ דולר</MenuItem>
                  <MenuItem value="EUR">€ יורו</MenuItem>
                </Select>
              </Field>
              <Field label="אחוז מע״מ"><TextField fullWidth size="small" type="number" value={form.tax_rate} onChange={e => u('tax_rate', parseFloat(e.target.value) || 0)} sx={inputSx} /></Field>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Field label="יעד הכנסה חודשי"><TextField fullWidth size="small" type="number" value={form.monthlyGoal || ''} onChange={e => u('monthlyGoal', parseFloat(e.target.value) || 0)} placeholder="0" sx={inputSx} /></Field>
              <Field label="דמי ביקור שירות"><TextField fullWidth size="small" type="number" value={form.service_fee || ''} onChange={e => u('service_fee', parseFloat(e.target.value) || 0)} placeholder="0" sx={inputSx} /></Field>
            </Box>
          </Section>
        </Box>

        {/* Right column */}
        <Box>
          {/* Language */}
          <Section icon="🌐" title="שפה ואזור">
            <Field label="שפת ממשק">
              <Box sx={{ display: 'flex', gap: '8px' }}>
                {[{ val: 'he', label: '🇮🇱 עברית' }, { val: 'en', label: '🇺🇸 English' }].map(l => (
                  <Button key={l.val} onClick={() => { setLang(l.val as any); saveCfg({ ...cfg, lang: l.val }); }}
                    sx={{ flex: 1, borderRadius: '10px', py: 1, fontSize: 13, fontWeight: 600,
                      bgcolor: lang === l.val ? '#4F46E510' : '#FAF7F4', color: lang === l.val ? '#4F46E5' : '#78716C',
                      border: '1px solid ' + (lang === l.val ? '#4F46E530' : 'rgba(0,0,0,0.06)') }}>
                    {l.label}
                  </Button>
                ))}
              </Box>
            </Field>
            <Field label="צבע מותג">
              <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={form.biz_color} onChange={e => u('biz_color', e.target.value)} style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                <TextField size="small" value={form.biz_color} onChange={e => u('biz_color', e.target.value)} sx={{ flex: 1, ...inputSx }} />
              </Box>
            </Field>
          </Section>

          {/* Templates */}
          <Section icon="📄" title="תבניות הצעה וקבלה">
            <Field label="טקסט תחתון להצעות מחיר"><TextField fullWidth size="small" multiline rows={2} value={form.quote_footer} onChange={e => u('quote_footer', e.target.value)} placeholder="הצעה תקפה ל-30 יום..." sx={inputSx} /></Field>
            <Field label="טקסט תחתון לקבלות"><TextField fullWidth size="small" multiline rows={2} value={form.receipt_footer} onChange={e => u('receipt_footer', e.target.value)} placeholder="תודה שבחרתם בנו!" sx={inputSx} /></Field>
          </Section>

          {/* AI Bot */}
          <Section icon="🤖" title="בוט AI">
            <Field label="ברכת פתיחה (כשלקוח מתקשר)"><TextField fullWidth size="small" multiline rows={2} value={form.bot_greeting} onChange={e => u('bot_greeting', e.target.value)} placeholder="שלום! הגעת ל[שם העסק]. איך אוכל לעזור?" sx={inputSx} /></Field>
          </Section>

          {/* Data */}
          <Section icon="💾" title="גיבוי ונתונים">
            <Field label="תגיות עבודה מותאמות"><TextField fullWidth size="small" value={form.custom_tags} onChange={e => u('custom_tags', e.target.value)} placeholder="דחוף, VIP, חוזר..." sx={inputSx} /></Field>
            <Box sx={{ display: 'flex', gap: '8px', mt: '8px' }}>
              <Button size="small" onClick={handleExport} sx={{ borderRadius: '8px', fontSize: 12, bgcolor: '#4F46E508', color: '#4F46E5', fontWeight: 600, flex: 1 }}>📥 הורד גיבוי JSON</Button>
              <Button size="small" onClick={handleSave} sx={{ borderRadius: '8px', fontSize: 12, bgcolor: '#05966908', color: '#059669', fontWeight: 600, flex: 1 }}>☁️ סנכרן לענן</Button>
            </Box>
          </Section>
        </Box>
      </Box>

      {/* Save button bottom */}
      <Box sx={{ textAlign: 'center', mt: '20px' }}>
        <Button variant="contained" onClick={handleSave} size="large" sx={{ borderRadius: '12px', px: 5, py: 1.5, fontSize: 15, fontWeight: 800 }}>💾 שמור הגדרות</Button>
      </Box>
    </Box>
  );
}
