'use client';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Select, MenuItem, Card, CardContent } from '@mui/material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import { useL } from '@/hooks/useL';
import { BUSINESS_TYPES } from '@/lib/constants';
import { zikkitColors as c } from '@/styles/theme';

const T = {
  title: ['Business Settings', '\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E2\u05E1\u05E7'],
  subtitle: ['Configure your Zikkit account', '\u05D4\u05D2\u05D3\u05E8 \u05D0\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF Zikkit \u05E9\u05DC\u05DA'],
  save: ['Save All Settings', '\u05E9\u05DE\u05D5\u05E8 \u05D4\u05DB\u05DC'],
  bizInfo: ['Business Information', '\u05E4\u05E8\u05D8\u05D9 \u05E2\u05E1\u05E7'],
  bizName: ['Business Name', '\u05E9\u05DD \u05D4\u05E2\u05E1\u05E7'],
  bizType: ['Business Type', '\u05E1\u05D5\u05D2 \u05E2\u05E1\u05E7'],
  phone: ['Phone', '\u05D8\u05DC\u05E4\u05D5\u05DF'],
  email: ['Email', '\u05DE\u05D9\u05D9\u05DC'],
  address: ['Address', '\u05DB\u05EA\u05D5\u05D1\u05EA'],
  langRegion: ['Language & Regional', '\u05E9\u05E4\u05D4 \u05D5\u05D0\u05D6\u05D5\u05E8'],
  language: ['Language', '\u05E9\u05E4\u05D4'],
  currency: ['Currency', '\u05DE\u05D8\u05D1\u05E2'],
  taxRate: ['Tax Rate (%)', '\u05D0\u05D7\u05D5\u05D6 \u05DE\u05E2\u05DE'],
  monthGoal: ['Monthly Revenue Goal', '\u05D9\u05E2\u05D3 \u05D4\u05DB\u05E0\u05E1\u05D4 \u05D7\u05D5\u05D3\u05E9\u05D9'],
  serviceFee: ['Service Call Fee', '\u05D3\u05DE\u05D9 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05E9\u05D9\u05E8\u05D5\u05EA'],
  brandColor: ['Brand Color', '\u05E6\u05D1\u05E2 \u05DE\u05D5\u05EA\u05D2'],
  templates: ['Quote & Receipt Templates', '\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05D4\u05E6\u05E2\u05D5\u05EA \u05D5\u05E7\u05D1\u05DC\u05D5\u05EA'],
  quoteFooter: ['Quote Footer Text', '\u05D8\u05E7\u05E1\u05D8 \u05EA\u05D7\u05EA\u05D5\u05DF \u05DC\u05D4\u05E6\u05E2\u05D5\u05EA'],
  receiptFooter: ['Receipt Footer Text', '\u05D8\u05E7\u05E1\u05D8 \u05EA\u05D7\u05EA\u05D5\u05DF \u05DC\u05E7\u05D1\u05DC\u05D5\u05EA'],
  tags: ['Custom Job Tags', '\u05EA\u05D2\u05D9\u05D5\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4'],
  tagsLabel: ['Tags (comma separated)', '\u05EA\u05D2\u05D9\u05D5\u05EA (\u05DE\u05D5\u05E4\u05E8\u05D3\u05D5\u05EA \u05D1\u05E4\u05E1\u05D9\u05E7)'],
  data: ['Data Management', '\u05E0\u05D9\u05D4\u05D5\u05DC \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD'],
  export: ['Export Backup', '\u05D9\u05E6\u05D0 \u05D2\u05D9\u05D1\u05D5\u05D9'],
  sync: ['Sync to Cloud', '\u05E1\u05E0\u05DB\u05E8\u05DF \u05DC\u05E2\u05E0\u05DF'],
  logo: ['Business Logo', '\u05DC\u05D5\u05D2\u05D5 \u05D4\u05E2\u05E1\u05E7'],
  subscription: ['Subscription', '\u05DE\u05E0\u05D5\u05D9'],
  embedTitle: ['Lead Form for Your Website', '\u05D8\u05D5\u05E4\u05E1 \u05DC\u05D9\u05D3 \u05DC\u05D0\u05EA\u05E8 \u05E9\u05DC\u05DA'],
  upgrade: ['Upgrade Plan', '\u05E9\u05D3\u05E8\u05D2 \u05EA\u05D5\u05DB\u05E0\u05D9\u05EA'],
} as const;

export default function SettingsPage() {
  const { cfg, saveCfg, db, saveData } = useData();
  const { toast } = useToast();
  const { lang, setLang } = useLanguage();
  const L = useL();

  const [bizName, setBizName] = useState(cfg.biz_name || '');
  const [bizType, setBizType] = useState(cfg.biz_type || '');
  const [bizPhone, setBizPhone] = useState(cfg.biz_phone || '');
  const [bizEmail, setBizEmail] = useState(cfg.biz_email || '');
  const [bizAddress, setBizAddress] = useState(cfg.biz_address || '');
  const [currency, setCurrency] = useState(cfg.currency || 'USD');
  const [taxRate, setTaxRate] = useState(cfg.tax_rate || 10);
  const [quoteFooter, setQuoteFooter] = useState(cfg.quote_footer || '');
  const [receiptFooter, setReceiptFooter] = useState(cfg.receipt_footer || '');
  const [customTags, setCustomTags] = useState((cfg.custom_tags || []).join(', '));
  const [monthlyGoal, setMonthlyGoal] = useState((cfg as Record<string, unknown>).monthlyGoal as number || 0);
  const [serviceFee, setServiceFee] = useState(cfg.service_fee || 0);
  const [bizColor, setBizColor] = useState(cfg.biz_color || '#00e5b0');

  useEffect(() => {
    setBizName(cfg.biz_name || '');
    setBizType(cfg.biz_type || '');
    setBizPhone(cfg.biz_phone || '');
    setBizEmail(cfg.biz_email || '');
    setBizAddress(cfg.biz_address || '');
    setCurrency(cfg.currency || 'USD');
    setTaxRate(cfg.tax_rate || 10);
    setQuoteFooter(cfg.quote_footer || '');
    setReceiptFooter(cfg.receipt_footer || '');
    setCustomTags((cfg.custom_tags || []).join(', '));
    setMonthlyGoal((cfg as Record<string, unknown>).monthlyGoal as number || 0);
    setServiceFee(cfg.service_fee || 0);
    setBizColor(cfg.biz_color || '#00e5b0');
  }, [cfg]);

  const t = (key: keyof typeof T) => lang === 'he' ? T[key][1] : T[key][0];

  const handleSave = async () => {
    await saveCfg({
      ...cfg, biz_name: bizName, biz_type: bizType, biz_phone: bizPhone,
      biz_email: bizEmail, biz_address: bizAddress, currency, tax_rate: taxRate,
      quote_footer: quoteFooter, receipt_footer: receiptFooter,
      custom_tags: customTags.split(',').map((x) => x.trim()).filter(Boolean),
      monthlyGoal, service_fee: serviceFee, biz_color: bizColor, setup_done: true,
    });
    toast('נשמר!');
  };

  const handleLanguageChange = (l: 'en' | 'es' | 'he') => {
    setLang(l);
    saveCfg({ ...cfg, lang: l });
  };

  const handleExport = () => {
    const data = { db, cfg, exported: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'zikkit-backup.json'; a.click(); URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const isHe = lang === 'he';
    const BOM = '\uFEFF';
    const jobsH = isHe
      ? ['#', '\u05E9\u05DD \u05DC\u05E7\u05D5\u05D7', '\u05D8\u05DC\u05E4\u05D5\u05DF', '\u05DE\u05D9\u05D9\u05DC', '\u05DB\u05EA\u05D5\u05D1\u05EA', '\u05DE\u05D9\u05E7\u05D5\u05D3', '\u05EA\u05D9\u05D0\u05D5\u05E8', '\u05E1\u05D8\u05D8\u05D5\u05E1', '\u05D8\u05DB\u05E0\u05D0\u05D9', '\u05E2\u05D3\u05D9\u05E4\u05D5\u05EA', '\u05D4\u05DB\u05E0\u05E1\u05D4', '\u05E2\u05DC\u05D5\u05EA \u05D7\u05D5\u05DE\u05E8\u05D9\u05DD', '\u05EA\u05D0\u05E8\u05D9\u05DA \u05DE\u05EA\u05D5\u05DB\u05E0\u05DF', '\u05E9\u05E2\u05D4', '\u05D4\u05E2\u05E8\u05D5\u05EA']
      : ['#', 'Client Name', 'Phone', 'Email', 'Address', 'ZIP', 'Description', 'Status', 'Technician', 'Priority', 'Revenue', 'Materials Cost', 'Scheduled Date', 'Scheduled Time', 'Notes'];
    const jobsEx = isHe
      ? ['1', '\u05D9\u05D5\u05E1\u05D9 \u05DB\u05D4\u05DF', '0501234567', 'yosi@email.com', '\u05D4\u05E8\u05E6\u05DC 12 \u05EA\u05DC \u05D0\u05D1\u05D9\u05D1', '6100000', '\u05EA\u05D9\u05E7\u05D5\u05DF \u05DE\u05D6\u05D2\u05DF', 'open', '\u05D3\u05D5\u05D3', 'normal', '350', '50', '2026-03-20', '10:00', '\u05E7\u05D5\u05DE\u05D4 3']
      : ['1', 'John Smith', '(555) 123-4567', 'john@email.com', '123 Main St, City', '10001', 'AC repair needed', 'open', 'Mike', 'normal', '350', '50', '2026-03-20', '10:00', '3rd floor unit'];
    const leadsH = isHe
      ? ['#', '\u05E9\u05DD', '\u05D8\u05DC\u05E4\u05D5\u05DF', '\u05DE\u05D9\u05D9\u05DC', '\u05DB\u05EA\u05D5\u05D1\u05EA', '\u05EA\u05D9\u05D0\u05D5\u05E8', '\u05E1\u05D8\u05D8\u05D5\u05E1', '\u05DE\u05E7\u05D5\u05E8', '\u05D4\u05E2\u05E8\u05D5\u05EA']
      : ['#', 'Name', 'Phone', 'Email', 'Address', 'Description', 'Status', 'Source', 'Notes'];
    const leadsEx = isHe
      ? ['1', '\u05D3\u05E0\u05D4 \u05DC\u05D5\u05D9', '0521234567', 'dana@email.com', '\u05D3\u05D9\u05D6\u05E0\u05D2\u05D5\u05E3 5 \u05D7\u05D9\u05E4\u05D4', '\u05E0\u05D6\u05D9\u05DC\u05EA \u05DE\u05D9\u05DD \u05D1\u05DE\u05D8\u05D1\u05D7', 'new', 'phone', '\u05D3\u05D7\u05D5\u05E3']
      : ['1', 'Jane Doe', '(555) 987-6543', 'jane@email.com', '456 Oak Ave', 'Water leak in kitchen', 'new', 'phone', 'Urgent'];
    const productsH = isHe
      ? ['#', '\u05E9\u05DD \u05DE\u05D5\u05E6\u05E8', '\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4', '\u05DE\u05D7\u05D9\u05E8', '\u05E2\u05DC\u05D5\u05EA', '\u05D9\u05D7\u05D9\u05D3\u05D4', '\u05EA\u05D9\u05D0\u05D5\u05E8']
      : ['#', 'Product Name', 'Category', 'Price', 'Cost', 'Unit', 'Description'];
    const productsEx = isHe
      ? ['1', '\u05D1\u05D9\u05E7\u05D5\u05E8 \u05E9\u05D9\u05E8\u05D5\u05EA', 'service', '89', '0', 'job', '\u05D1\u05D9\u05E7\u05D5\u05E8 \u05D0\u05D1\u05D7\u05D5\u05DF']
      : ['1', 'Service Call', 'service', '89', '0', 'job', 'Diagnostic visit'];

    const q = (r: string[]) => r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(',');
    const sheet = [
      isHe ? '--- \u05E2\u05D1\u05D5\u05D3\u05D5\u05EA (Jobs) ---' : '--- Jobs ---',
      q(jobsH), q(jobsEx), '',
      isHe ? '--- \u05DC\u05D9\u05D3\u05D9\u05DD (Leads) ---' : '--- Leads ---',
      q(leadsH), q(leadsEx), '',
      isHe ? '--- \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD (Products) ---' : '--- Products ---',
      q(productsH), q(productsEx), '',
      isHe ? '# \u05D4\u05D5\u05E8\u05D0\u05D5\u05EA:' : '# Instructions:',
      isHe ? '# 1. \u05DE\u05DC\u05D0 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05EA\u05D7\u05EA \u05DC\u05E9\u05D5\u05E8\u05EA \u05D4\u05D3\u05D5\u05D2\u05DE\u05D4' : '# 1. Fill data below the example row',
      isHe ? '# 2. \u05E9\u05DE\u05D5\u05E8 \u05DB-CSV (UTF-8)' : '# 2. Save as CSV (UTF-8)',
      isHe ? '# 3. \u05D9\u05D9\u05D1\u05D0 \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u2192 \u05E0\u05D9\u05D4\u05D5\u05DC \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u2192 \u05D9\u05D9\u05D1\u05D0 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE-CSV' : '# 3. Import in Settings > Data Management > Import CSV',
      isHe ? '# \u05E1\u05D8\u05D8\u05D5\u05E1\u05D9\u05DD: open, assigned, in_progress, waiting_parts, parts_arrived, scheduled, completed, cancelled, no_answer, callback' : '# Statuses: open, assigned, in_progress, waiting_parts, parts_arrived, scheduled, completed, cancelled, no_answer, callback',
      isHe ? '# \u05E2\u05D3\u05D9\u05E4\u05D5\u05EA: urgent, high, normal, low' : '# Priorities: urgent, high, normal, low',
      isHe ? '# \u05DE\u05E7\u05D5\u05E8\u05D5\u05EA: phone, web, ai_bot, referral, walk_in, manual' : '# Sources: phone, web, ai_bot, referral, walk_in, manual',
      isHe ? '# \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA: service, part, labor, material, other' : '# Categories: service, part, labor, material, other',
    ].join('\n');
    const blob = new Blob([BOM + sheet], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'zikkit-import-template.csv'; a.click(); URL.revokeObjectURL(url);
    toast(lang === 'he' ? '\u05EA\u05D1\u05E0\u05D9\u05EA \u05D4\u05D5\u05E8\u05D3\u05D4!' : 'Template downloaded!');
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
    if (lines.length < 2) { toast(lang === 'he' ? '\u05E7\u05D5\u05D1\u05E5 \u05E8\u05D9\u05E7' : 'קובץ ריק'); return; }

    const parse = (line: string): string[] => {
      const result: string[] = [];
      let current = ''; let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      result.push(current.trim());
      return result;
    };

    let jobsAdded = 0, leadsAdded = 0, productsAdded = 0;
    const jobs = [...(db.jobs || [])];
    const leads = [...(db.leads || [])];
    const products = [...(db.products || [])];
    let section = '';

    for (const line of lines) {
      const cols = parse(line);
      if (cols.length < 2) continue;
      const first = cols[0].toLowerCase();

      // Detect section by header row
      if (first === '#' || first === 'id') {
        if (cols.some((c) => c.toLowerCase().includes('client') || c.includes('\u05DC\u05E7\u05D5\u05D7'))) section = 'jobs';
        else if (cols.some((c) => c.toLowerCase().includes('source') || c.includes('\u05DE\u05E7\u05D5\u05E8'))) section = 'leads';
        else if (cols.some((c) => c.toLowerCase().includes('product') || c.includes('\u05DE\u05D5\u05E6\u05E8'))) section = 'products';
        continue;
      }

      if (section === 'jobs' && cols.length >= 3) {
        const maxId = jobs.reduce((m, j) => Math.max(m, j.id || 0), 0);
        jobs.push({
          id: maxId + 1, num: '#' + String(maxId + 1).padStart(4, '0'),
          client: cols[1] || '', phone: cols[2] || '', email: cols[3] || '',
          address: cols[4] || '', zip: cols[5] || '', desc: cols[6] || '',
          status: (cols[7] || 'open') as 'open', tech: cols[8] || '',
          priority: (cols[9] || 'normal') as 'normal',
          revenue: parseFloat(cols[10]) || 0, materials: parseFloat(cols[11]) || 0,
          scheduledDate: cols[12] || '', scheduledTime: cols[13] || cols[12]?.split('T')[1] || '',
          notes: cols[14] || '', created: new Date().toISOString(), source: 'import',
        } as typeof jobs[0]);
        jobsAdded++;
      } else if (section === 'leads' && cols.length >= 3) {
        const maxId = leads.reduce((m, l) => Math.max(m, l.id || 0), 0);
        leads.push({
          id: maxId + 1, name: cols[1] || '', phone: cols[2] || '', email: cols[3] || '',
          address: cols[4] || '', desc: cols[5] || '',
          status: (cols[6] || 'new') as 'new', source: (cols[7] || 'manual') as 'manual',
          notes: cols[8] || '', created: new Date().toISOString(),
        } as typeof leads[0]);
        leadsAdded++;
      } else if (section === 'products' && cols.length >= 3) {
        const maxId = products.reduce((m, p) => Math.max(m, p.id || 0), 0);
        products.push({
          id: maxId + 1, name: cols[1] || '', category: cols[2] || 'service',
          price: parseFloat(cols[3]) || 0, cost: parseFloat(cols[4]) || 0,
          unit: cols[5] || 'job', desc: cols[6] || '',
        } as typeof products[0]);
        productsAdded++;
      }
    }

    await saveData({ ...db, jobs, leads, products });
    const msg = lang === 'he'
      ? `\u05D9\u05D5\u05D1\u05D0\u05D5! ${jobsAdded} \u05E2\u05D1\u05D5\u05D3\u05D5\u05EA, ${leadsAdded} \u05DC\u05D9\u05D3\u05D9\u05DD, ${productsAdded} \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD`
      : `Imported! ${jobsAdded} jobs, ${leadsAdded} leads, ${productsAdded} products`;
    toast(msg);
    e.target.value = '';
  };

  const Lbl = ({ text }: { text: string }) => (
    <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Typography>
  );

  const Section = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <Card sx={{ mb: '16px' }}>
      <Box sx={{ p: '12px 16px', borderBottom: '1px solid ' + c.border }}>
        <Typography sx={{ fontFamily: "'Rubik', sans-serif", fontSize: 12, fontWeight: 700 }}>{icon} {title}</Typography>
      </Box>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.2s ease', maxWidth: 800 }}>
      <SectionHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<Button variant="contained" size="small" onClick={handleSave}>{t('save')}</Button>}
      />

      <Section icon="🏢" title={t('bizInfo')}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Box><Lbl text={t('bizName')} /><TextField fullWidth size="small" value={bizName} onChange={(e) => setBizName(e.target.value)} /></Box>
          <Box><Lbl text={t('bizType')} />
            <Select fullWidth size="small" value={bizType} onChange={(e) => setBizType(e.target.value)}
              sx={{ bgcolor: c.surface3, borderRadius: '10px', fontSize: 13 }}>
              <MenuItem value="">—</MenuItem>
              {BUSINESS_TYPES.map((bt) => <MenuItem key={bt.key} value={bt.key}>{bt.icon} {bt.label}</MenuItem>)}
            </Select>
          </Box>
          <Box><Lbl text={t('phone')} /><TextField fullWidth size="small" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} /></Box>
          <Box><Lbl text={t('email')} /><TextField fullWidth size="small" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} /></Box>
        </Box>
        <Box sx={{ mt: '14px' }}><Lbl text={t('address')} /><TextField fullWidth size="small" value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} /></Box>
      </Section>

      <Section icon="🌐" title={t('langRegion')}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <Box>
            <Lbl text={t('language')} />
            <Box sx={{ display: 'flex', gap: '6px' }}>
              {(['en', 'es', 'he'] as const).map((l) => (
                <Button key={l} size="small" onClick={() => handleLanguageChange(l)} sx={{
                  px: '10px', py: '4px', fontSize: 11, fontWeight: 600, borderRadius: '8px', minWidth: 'auto',
                  bgcolor: lang === l ? c.accentDim : c.glass2, color: lang === l ? c.accent : c.text3,
                  border: '1px solid ' + (lang === l ? 'rgba(0,229,176,0.3)' : c.border2),
                }}>
                  {l === 'en' ? '🇺🇸 EN' : l === 'es' ? '🇪🇸 ES' : '🇮🇱 HE'}
                </Button>
              ))}
            </Box>
          </Box>
          <Box><Lbl text={t('currency')} />
            <Select fullWidth size="small" value={currency} onChange={(e) => setCurrency(e.target.value)}
              sx={{ bgcolor: c.surface3, borderRadius: '10px', fontSize: 13 }}>
              <MenuItem value="USD">$ USD</MenuItem><MenuItem value="ILS">ILS</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem><MenuItem value="GBP">GBP</MenuItem>
            </Select>
          </Box>
          <Box><Lbl text={t('taxRate')} /><TextField fullWidth size="small" type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} /></Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', mt: '14px' }}>
          <Box><Lbl text={t('monthGoal')} /><TextField fullWidth size="small" type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 0)} /></Box>
          <Box><Lbl text={t('serviceFee')} /><TextField fullWidth size="small" type="number" value={serviceFee} onChange={(e) => setServiceFee(parseFloat(e.target.value) || 0)} /></Box>
        </Box>
        <Box sx={{ mt: '14px' }}><Lbl text={t('brandColor')} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <input type="color" value={bizColor} onChange={(e) => setBizColor(e.target.value)} style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
            <TextField size="small" value={bizColor} onChange={(e) => setBizColor(e.target.value)} sx={{ width: 120 }} />
          </Box>
        </Box>
      </Section>

      <Section icon="📄" title={t('templates')}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Box><Lbl text={t('quoteFooter')} /><TextField fullWidth size="small" multiline rows={2} value={quoteFooter} onChange={(e) => setQuoteFooter(e.target.value)} /></Box>
          <Box><Lbl text={t('receiptFooter')} /><TextField fullWidth size="small" multiline rows={2} value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} /></Box>
        </Box>
      </Section>

      <Section icon="🏷️" title={t('tags')}>
        <Lbl text={t('tagsLabel')} />
        <TextField fullWidth size="small" value={customTags} onChange={(e) => setCustomTags(e.target.value)} placeholder="VIP, אחריות, חזרה" />
      </Section>

      <Section icon="💾" title={t('data')}>
        <Box sx={{ display: 'flex', gap: '10px' }}>
          <Button size="small" onClick={handleExport} sx={{ bgcolor: c.blueDim, color: c.blue, border: '1px solid rgba(79,143,255,0.2)', borderRadius: '8px', p: '8px 16px', fontSize: 12, fontWeight: 700 }}>{t('export')}</Button>
          <Button size="small" onClick={handleSave} sx={{ bgcolor: c.greenDim, color: c.green, border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', p: '8px 16px', fontSize: 12, fontWeight: 700 }}>{t('sync')}</Button>
          <Button size="small" onClick={handleDownloadTemplate} sx={{ bgcolor: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', p: '8px 16px', fontSize: 12, fontWeight: 700 }}>
            {lang === 'he' ? '📋 הורד תבנית ייבוא' : '📋 Download Import Template'}
          </Button>
          <Button size="small" component="label" sx={{ bgcolor: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', p: '8px 16px', fontSize: 12, fontWeight: 700 }}>
            {lang === 'he' ? '📥 ייבא נתונים מ-CSV' : '📥 Import Data from CSV'}
            <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
          </Button>
        </Box>
      </Section>

      <Card sx={{ mb: '14px' }}><CardContent sx={{ p: '18px !important' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>{t('logo')}</Typography>
        <LogoUpload />
      </CardContent></Card>

      <Card sx={{ mb: '14px' }}><CardContent sx={{ p: '18px !important' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>{t('subscription')}</Typography>
        <Typography sx={{ fontSize: 13, color: c.text2, mb: 1 }}>Plan: {cfg.plan || 'Trial'}</Typography>
        <Button variant="contained" size="small" href="/checkout" sx={{ fontWeight: 700, fontSize: 12 }}>{t('upgrade')}</Button>
      </CardContent></Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: '8px' }}>
        <Button variant="contained" onClick={handleSave} sx={{ p: '12px 32px', fontSize: 14, fontWeight: 800 }}>{t('save')}</Button>
      </Box>
    </Box>
  );
}
