'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';

import { useState, useMemo, useEffect } from 'react';
import { Box, Button, TextField, Typography, Select, MenuItem, IconButton, Menu, InputAdornment } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { usePortal } from '@/hooks/usePortal';
import { formatCurrency, formatDate, formatJobNumber } from '@/lib/formatters';
import { zikkitColors as c } from '@/styles/theme';
import type { Quote, QuoteItem, QuoteStatus, Job } from '@/types';

const STATUS_MAP: Record<string, 'new' | 'open' | 'done' | 'hot' | 'grey'> = {
  draft: 'grey', sent: 'open', approved: 'done', accepted: 'done', declined: 'hot', expired: 'grey',
};
const STATUS_HE: Record<string, string> = {
  draft: '\u05D8\u05D9\u05D5\u05D8\u05D4', sent: '\u05E0\u05E9\u05DC\u05D7', approved: '\u05D0\u05D5\u05E9\u05E8+\u05D7\u05EA\u05D5\u05DD', accepted: '\u05D0\u05D5\u05E9\u05E8', declined: '\u05E0\u05D3\u05D7\u05D4', expired: '\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E3',
};

export default function QuotesPage() {
  const { db, saveData, cfg } = useData();
  const L = useL();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { sendQuotePortal, resendPortalLink, sendQuotePortalSms } = usePortal();
  const [showModal, setShowModal] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigQuote, setSigQuote] = useState<Quote | null>(null);
  const [editQuote, setEditQuote] = useState<Partial<Quote>>({});
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const currency = cfg.currency || (cfg.region === 'IL' || cfg.lang === 'he' ? 'ILS' : 'USD');
  const taxRate = cfg.tax_rate || 0;

  // Auto-sync signatures from portal docs back to quotes
  useEffect(() => {
    const syncSignatures = async () => {
      const quotes = db.quotes || [];
      const withPortal = quotes.filter((q) => q.portalToken && !q.signedAt);
      if (withPortal.length === 0) return;

      try {
        const { getFirestoreDb, doc: fbDoc, getDoc: fbGet } = await import('@/lib/firebase');
        const firestore = getFirestoreDb();
        let updated = false;
        const quotesList = [...quotes];

        for (const q of withPortal) {
          try {
            const portalSnap = await fbGet(fbDoc(firestore, 'public_portals', q.portalToken!));
            if (portalSnap.exists()) {
              const pData = portalSnap.data();
              if (pData.signedAt || pData.signatureData) {
                const idx = quotesList.findIndex((x) => x.id === q.id);
                if (idx >= 0) {
                  quotesList[idx] = {
                    ...quotesList[idx],
                    status: 'approved',
                    signature: pData.signatureData || '',
                    signedAt: pData.signedAt || '',
                    signedName: pData.signedName || '',
                    signedIP: pData.signedIP || '',
                  };
                  updated = true;
                }
              }
            }
          } catch {}
        }

        if (updated) {
          await saveData({ ...db, quotes: quotesList });
        }
      } catch {}
    };
    syncSignatures();
  }, [db.quotes?.length]);

  // Actions menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuQuote, setMenuQuote] = useState<Quote | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: (db.quotes || []).length };
    (db.quotes || []).forEach((q) => { counts[q.status] = (counts[q.status] || 0) + 1; });
    return counts;
  }, [db.quotes]);

  const quotes = useMemo(() => {
    let list = [...(db.quotes || [])];
    if (statusFilter !== 'all') list = list.filter((q) => q.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((q2) => q2.client?.toLowerCase().includes(q) || q2.phone?.includes(q));
    }
    return list.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [db.quotes, search, statusFilter]);

  const products = db.products || [];

  const openNew = () => {
    setEditQuote({ client: '', phone: '', email: '', address: '', status: 'draft', notes: '' });
    setItems([{ id: 1, name: '', qty: 1, price: 0 }]);
    setShowModal(true);
  };

  const openEdit = (q: Quote) => {
    setEditQuote({ ...q });
    setItems(q.items || [{ id: 1, name: '', qty: 1, price: 0 }]);
    setShowModal(true);
  };

  const addItem = () => {
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
    setItems([...items, { id: maxId + 1, name: '', qty: 1, price: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: number, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  const selectProduct = (itemId: number, productId: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems(items.map((i) => i.id === itemId ? { ...i, name: prod.name, price: prod.price } : i));
  };

  const subtotal = items.reduce((s, i) => s + (i.qty * i.price), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const handleSave = async () => {
    if (!editQuote.client?.trim()) { toast('הכנס שם לקוח', c.hot); return; }
    if (items.every((i) => !i.name)) { toast('הוסף לפחות פריט אחד', c.hot); return; }

    const quotesList = [...(db.quotes || [])];
    const quoteData: Quote = {
      ...editQuote as Quote,
      items: items.filter((i) => i.name),
      subtotal, tax, total,
    };

    if (editQuote.id) {
      const idx = quotesList.findIndex((q) => q.id === editQuote.id);
      if (idx >= 0) quotesList[idx] = quoteData;
    } else {
      const maxId = quotesList.reduce((m, q) => Math.max(m, q.id || 0), 0);
      quoteData.id = maxId + 1;
      quoteData.created = new Date().toISOString();
      quoteData.status = 'draft';
      quotesList.push(quoteData);
    }
    await saveData({ ...db, quotes: quotesList });
    setShowModal(false);
    toast(editQuote.id ? '✅ Quote updated!' : '✅ Quote created!');
  };

  // ── Actions ──
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, quote: Quote) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuQuote(quote);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuQuote(null);
  };

  const handleDelete = async (quote: Quote) => {
    if (!confirm(L('Delete quote ','מחק הצעה ') + 'Q-' + quote.id + '?')) return;
    await saveData({ ...db, quotes: (db.quotes || []).filter((q) => q.id !== quote.id) });
    toast(L('הצעת מחיר נמחקה','הצעה נמחקה'));
    handleCloseMenu();
  };

  const handleDuplicate = async (quote: Quote) => {
    const quotesList = [...(db.quotes || [])];
    const maxId = quotesList.reduce((m, q) => Math.max(m, q.id || 0), 0);
    const dup: Quote = {
      ...quote,
      id: maxId + 1,
      status: 'draft',
      created: new Date().toISOString(),
      items: quote.items.map((i, idx) => ({ ...i, id: idx + 1 })),
    };
    quotesList.push(dup);
    await saveData({ ...db, quotes: quotesList });
    toast('✅ Quote duplicated as Q-' + dup.id);
    handleCloseMenu();
  };

  const handleConvertToJob = async (quote: Quote) => {
    const jobs = [...(db.jobs || [])];
    const maxId = jobs.reduce((m, j) => Math.max(m, j.id || 0), 0);
    const newJobId = maxId + 1;
    const newJob: Job = {
      id: newJobId,
      num: formatJobNumber(newJobId),
      client: quote.client,
      phone: quote.phone || '',
      address: quote.address || '',
      desc: `Quote Q-${quote.id}: ${quote.items.map((i) => i.name).join(', ')}`,
      status: 'open',
      priority: 'normal',
      revenue: quote.total,
      created: new Date().toISOString(),
      source: 'quote',
      notes: `Created from Quote Q-${quote.id}`,
    };
    jobs.push(newJob);

    // Mark quote as accepted
    const quotesList = [...(db.quotes || [])];
    const idx = quotesList.findIndex((q) => q.id === quote.id);
    if (idx >= 0) quotesList[idx] = { ...quotesList[idx], status: 'accepted', jobId: newJobId };

    await saveData({ ...db, jobs, quotes: quotesList });
    toast(`✅ Job ${newJob.num} created from quote!`);
    handleCloseMenu();
  };

  const handleStatusChange = async (quote: Quote, newStatus: QuoteStatus) => {
    const quotesList = [...(db.quotes || [])];
    const idx = quotesList.findIndex((q) => q.id === quote.id);
    if (idx >= 0) {
      quotesList[idx] = { ...quotesList[idx], status: newStatus };
      await saveData({ ...db, quotes: quotesList });
      toast(L('סטטוס עודכן','סטטוס עודכן'));
    }
    handleCloseMenu();
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title={L("Quotes & Estimates","הצעות מחיר")} subtitle={quotes.length + L(' quotes',' הצעות')} actions={
        <Button variant="contained" size="small" onClick={openNew}>{L(L('+ הצעת מחיר חדשה','+ הצעה חדשה'),'+ הצעת מחיר חדשה')}</Button>
      } />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: '10px', mb: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField placeholder={L("L('חיפוש הצעות מחיר...','חפש הצעות...')","חפש הצעות...")} value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#78716C' }} /></InputAdornment> }} />
      </Box>
      <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap', mb: '12px' }}>
        {['all', 'draft', 'sent', 'approved', 'accepted', 'declined', 'expired'].map((s) => (
          <Button key={s} size="small" onClick={() => setStatusFilter(s)} sx={{
            px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
            bgcolor: statusFilter === s ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
            color: statusFilter === s ? '#4F46E5' : '#78716C',
            border: '1px solid ' + (statusFilter === s ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
          }}>
            {s === 'all' ? L(`All (${statusCounts.all || 0})`,`הכל (${statusCounts.all || 0})`) : (() => { const heS: Record<string,string> = { draft: 'טיוטה', sent: 'נשלח', approved: 'אושר', accepted: 'אושר', declined: 'נדחה', expired: 'פג תוקף' }; return `${lang === 'he' ? heS[s] || s : s} (${statusCounts[s] || 0})`; })()}
          </Button>
        ))}
      </Box>

      {quotes.length === 0 ? (
        <EmptyState icon="📄" title={L("No Quotes","אין הצעות מחיר")} subtitle={L("Create your first quote.","צור את הצעת המחיר הראשונה שלך.")} actionLabel={L("+ הצעת מחיר חדשה","+ הצעת מחיר חדשה")} onAction={openNew} />
      ) : (
        <Box sx={{ bgcolor: c.surface2, border: '1px solid ' + c.border, borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<Quote>
            keyExtractor={(q) => q.id}
            columns={[
              { key: 'id', label: '#', render: (q) => <Typography sx={{ fontWeight: 700, fontSize: 11 }}>Q-{q.id}</Typography>, width: 60 },
              { key: 'client', label: L('Client','לקוח') },
              { key: 'items', label: L('Items','פריטים'), render: (q) => (q.items?.length || 0) + ' פריטים' },
              { key: 'total', label: L('Total','סהכ'), render: (q) => <Typography sx={{ fontWeight: 700, color: c.accent }}>{formatCurrency(q.total, currency)}</Typography> },
              { key: 'status', label: L('Status','סטטוס'), render: (q) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Badge label={lang === 'he' ? (STATUS_HE[q.status] || q.status) : q.status} variant={STATUS_MAP[q.status] || 'grey'} />
                  {q.signature && <span title={L('Signed by: ','נחתם ע"י: ') + (q.signedName || '')}>✍️</span>}
                </span>
              )},
              { key: 'created', label: L('Date','תאריך'), render: (q) => formatDate(q.created) },
              { key: 'actions', label: '', width: 80, render: (q) => (
                <Button size="small" onClick={(e) => handleOpenMenu(e, q)}
                  sx={{ fontSize: 11, minWidth: 'auto', p: '3px 10px', bgcolor: 'rgba(0,0,0,0.03)', color: '#A8A29E', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px' }}>
                  {L('⋮ פעולות','⋮ פעולות')}
                </Button>
              )},
            ]}
            data={quotes}
            onRowClick={openEdit}
          />
        </Box>
      )}

      {/* ── Actions Menu ── */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}
        PaperProps={{ sx: { bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', minWidth: 200 } }}>
        <MenuItem onClick={() => { if (menuQuote) openEdit(menuQuote); handleCloseMenu(); }}
          sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
          {L('✏️ עריכת הצעת מחיר','✏️ ערוך הצעה')}
        </MenuItem>
        <MenuItem onClick={() => { if (menuQuote) handleDuplicate(menuQuote); }}
          sx={{ fontSize: 12, gap: '8px', color: '#4f8fff', '&:hover': { bgcolor: 'rgba(79,143,255,0.08)' } }}>
          {L('📋 Duplicate Quote','📋 שכפל הצעה')}
        </MenuItem>

        {menuQuote && (menuQuote.email || menuQuote.phone) && (
          <MenuItem onClick={async () => {
            if (!menuQuote) return;
            const email = menuQuote.email;
            if (!email) {
              toast('אין כתובת אימייל להצעה. הוסף אחת קודם.', '#ff4d6d');
              handleCloseMenu();
              return;
            }
            const sent = await sendQuotePortal(menuQuote, email);
            if (sent && menuQuote.status === 'draft') {
              const quotesList = [...(db.quotes || [])];
              const idx = quotesList.findIndex((q) => q.id === menuQuote.id);
              if (idx >= 0) {
                quotesList[idx] = { ...quotesList[idx], status: 'sent' };
                await saveData({ ...db, quotes: quotesList });
              }
            }
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#a78bfa', fontWeight: 700, '&:hover': { bgcolor: 'rgba(167,139,250,0.08)' } }}>
            📧 {L('Send Quote to Client','\u05E9\u05DC\u05D7 \u05D4\u05E6\u05E2\u05D4 \u05DC\u05DC\u05E7\u05D5\u05D7')}
          </MenuItem>
        )}

        {menuQuote && menuQuote.phone && (
          <MenuItem onClick={async () => {
            if (!menuQuote) return;
            const sent = await sendQuotePortalSms(menuQuote, menuQuote.phone);
            if (sent && menuQuote.status === 'draft') {
              const quotesList = [...(db.quotes || [])];
              const idx = quotesList.findIndex((q) => q.id === menuQuote.id);
              if (idx >= 0) {
                quotesList[idx] = { ...quotesList[idx], status: 'sent' };
                await saveData({ ...db, quotes: quotesList });
              }
            }
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#22c55e', fontWeight: 700, '&:hover': { bgcolor: 'rgba(34,197,94,0.08)' } }}>
            📱 {L('Send Quote via SMS','\u05E9\u05DC\u05D7 \u05D1-SMS')}
          </MenuItem>
        )}

        {menuQuote && menuQuote.phone && (
          <MenuItem onClick={async () => {
            if (!menuQuote) return;
            const url = menuQuote.portalToken ? `${window.location.origin}/portal/${menuQuote.portalToken}` : '';
            const msg = `היי ${menuQuote.client || ''}, הנה הצעת המחיר שלך מ-${cfg.biz_name || 'העסק'}${url ? ': ' + url : ''}`;
            const phone = menuQuote.phone.replace(/[^0-9]/g, '');
            const waPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
            window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#25D366', fontWeight: 700, '&:hover': { bgcolor: 'rgba(37,211,102,0.08)' } }}>
            💬 {L('Send via WhatsApp','\u05E9\u05DC\u05D7 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4')}
          </MenuItem>
        )}

        {menuQuote && menuQuote.portalToken && (
          <MenuItem onClick={async () => {
            if (!menuQuote) return;
            const email = menuQuote.email;
            if (!email) { toast('אין כתובת אימייל.', '#ff4d6d'); handleCloseMenu(); return; }
            await resendPortalLink('quote', menuQuote, email);
            handleCloseMenu();
          }}
            sx={{ fontSize: 12, gap: '8px', color: '#06b6d4', '&:hover': { bgcolor: 'rgba(6,182,212,0.08)' } }}>
            🔄 {L('Resend Portal Link','\u05E9\u05DC\u05D7 \u05DC\u05D9\u05E0\u05E7 \u05E9\u05D5\u05D1')}
          </MenuItem>
        )}

        {menuQuote && menuQuote.status !== 'accepted' && (
          <MenuItem onClick={() => { if (menuQuote) handleConvertToJob(menuQuote); }}
            sx={{ fontSize: 12, gap: '8px', color: '#4F46E5', fontWeight: 700, '&:hover': { bgcolor: 'rgba(79,70,229,0.08)' } }}>
            🔧 {L('המר לעבודה','\u05D4\u05DE\u05E8 \u05DC\u05E2\u05D1\u05D5\u05D3\u05D4')}
          </MenuItem>
        )}

        {menuQuote && menuQuote.signature && (
          <MenuItem onClick={() => { setSigQuote(menuQuote); setShowSigModal(true); handleCloseMenu(); }}
            sx={{ fontSize: 12, gap: '8px', color: '#22c55e', fontWeight: 700, '&:hover': { bgcolor: 'rgba(34,197,94,0.08)' } }}>
            {L('✍️ View Signature','✍️ צפה בחתימה')}
          </MenuItem>
        )}

        <Box sx={{ px: '16px', py: '6px', fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {L('שנה סטטוס','שנה סטטוס')}
        </Box>
        {(['draft', 'sent', 'accepted', 'declined', 'expired'] as QuoteStatus[]).map((s) => {
          const heLabels: Record<string, string> = { draft: '\u05D8\u05D9\u05D5\u05D8\u05D4', sent: '\u05E0\u05E9\u05DC\u05D7', accepted: '\u05D0\u05D5\u05E9\u05E8', declined: '\u05E0\u05D3\u05D7\u05D4', expired: '\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E3' };
          return (
            <MenuItem key={s} onClick={() => { if (menuQuote) handleStatusChange(menuQuote, s); }}
              sx={{ fontSize: 12, gap: '8px', color: '#A8A29E', pl: '24px', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
              {lang === 'he' ? heLabels[s] || s : s}
            </MenuItem>
          );
        })}

        <Box sx={{ height: '1px', bgcolor: 'rgba(0,0,0,0.06)', my: '4px' }} />
        <MenuItem onClick={() => { if (menuQuote) handleDelete(menuQuote); }}
          sx={{ fontSize: 12, gap: '8px', color: '#ff4d6d', '&:hover': { bgcolor: 'rgba(255,77,109,0.1)' } }}>
          {L('🗑️ Delete Quote','🗑️ מחק הצעה')}
        </MenuItem>
      </Menu>

      {/* ── Edit/Create Modal ── */}
      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editQuote.id ? L('עריכת הצעת מחיר ','\u05E2\u05E8\u05D5\u05DA \u05D4\u05E6\u05E2\u05D4 ') + 'Q-' + editQuote.id : L('הצעת מחיר חדשה','\u05D4\u05E6\u05E2\u05D4 \u05D7\u05D3\u05E9\u05D4')} maxWidth={680}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button variant="contained" size="small" onClick={handleSave}>{editQuote.id ? 'עדכן' : 'צור הצעה'}</Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Client Name *","שם לקוח *")} /><TextField fullWidth size="small" value={editQuote.client || ''} onChange={(e) => setEditQuote({ ...editQuote, client: e.target.value })} /></Box>
            <Box><Label text={L("Phone","טלפון")} /><TextField fullWidth size="small" value={editQuote.phone || ''} onChange={(e) => setEditQuote({ ...editQuote, phone: e.target.value })} /></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Email","מייל")} /><TextField fullWidth size="small" value={editQuote.email || ''} onChange={(e) => setEditQuote({ ...editQuote, email: e.target.value })} /></Box>
            <Box><Label text={L("Address","כתובת")} /><TextField fullWidth size="small" value={editQuote.address || ''} onChange={(e) => setEditQuote({ ...editQuote, address: e.target.value })} /></Box>
          </Box>

          {/* Line items */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '8px' }}>
              <Label text={L("Line Items","פריטים")} />
              <Button size="small" onClick={addItem} sx={{ fontSize: 10, p: '2px 10px', bgcolor: c.accentDim, color: c.accent, border: '1px solid rgba(0,229,176,0.25)', borderRadius: '6px' }}>
                + Add Item
              </Button>
            </Box>
            {items.map((item) => (
              <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', mb: '8px', alignItems: 'center' }}>
                <Box>
                  {products.length > 0 ? (
                    <Select fullWidth size="small" value={item.name || ''} displayEmpty
                      onChange={(e) => {
                        const val = e.target.value;
                        const prod = products.find((p) => p.name === val);
                        if (prod) selectProduct(item.id, prod.id);
                        else updateItem(item.id, 'name', val);
                      }}
                      sx={{ bgcolor: c.surface3, borderRadius: '8px', fontSize: 12, '& fieldset': { borderColor: c.border2 } }}>
                      <MenuItem value="" disabled><em>Select product...</em></MenuItem>
                      {products.map((p) => <MenuItem key={p.id} value={p.name}>{p.name} — {formatCurrency(p.price, currency)}</MenuItem>)}
                    </Select>
                  ) : (
                    <TextField fullWidth size="small" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="שם פריט" />
                  )}
                </Box>
                <TextField size="small" type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)} sx={{ '& input': { textAlign: 'center' } }} />
                <TextField size="small" type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} />
                <IconButton size="small" onClick={() => removeItem(item.id)} sx={{ color: c.hot, opacity: items.length <= 1 ? 0.3 : 1 }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>

          {/* Totals — using cfg.tax_rate */}
          <Box sx={{ bgcolor: c.surface3, border: '1px solid ' + c.border, borderRadius: '10px', p: '12px 16px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
              <Typography sx={{ fontSize: 12, color: c.text3 }}>{L("Subtotal","סיכום ביניים")}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(subtotal, currency)}</Typography>
            </Box>
            {taxRate > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 12, color: c.text3 }}>Tax ({taxRate}%)</Typography>
                <Typography sx={{ fontSize: 12 }}>{formatCurrency(tax, currency)}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '8px', borderTop: '1px solid ' + c.border }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{L("Total","סה\"כ")}</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: c.accent }}>{formatCurrency(total, currency)}</Typography>
            </Box>
          </Box>

          <Box><Label text={L("Notes","הערות")} /><TextField fullWidth size="small" multiline rows={2} value={editQuote.notes || ''} onChange={(e) => setEditQuote({ ...editQuote, notes: e.target.value })} /></Box>
        </Box>
      </ModalBase>

      {/* ── Signature View Modal ── */}
      <ModalBase open={showSigModal} onClose={() => setShowSigModal(false)} title={L('Digital Signature','חתימה דיגיטלית')} maxWidth={500}>
        {sigQuote && (
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ bgcolor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', p: 3, mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#22c55e', mb: 1 }}>
                {L('Quote Approved & Signed','הצעה אושרה ונחתמה')}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#A8A29E' }}>
                {L('Quote','הצעה')} Q-{sigQuote.id} · {sigQuote.client}
              </Typography>
            </Box>

            {sigQuote.signature && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#0d1117', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography sx={{ fontSize: 10, color: '#78716C', mb: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                  {L('Signature','חתימה')}
                </Typography>
                <Box component="img" src={sigQuote.signature} alt="Signature" sx={{ maxWidth: '100%', height: 80, objectFit: 'contain' }} />
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, textAlign: 'right' }}>
              <Box sx={{ bgcolor: '#0d1117', borderRadius: '10px', p: 2 }}>
                <Typography sx={{ fontSize: 9, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>{L('Signed By','נחתם על ידי')}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#e8f0f4' }}>{sigQuote.signedName || '—'}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#0d1117', borderRadius: '10px', p: 2 }}>
                <Typography sx={{ fontSize: 9, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>{L('Date & Time','תאריך ושעה')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#e8f0f4' }}>
                  {sigQuote.signedAt ? new Date(sigQuote.signedAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US') : '—'}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: '#0d1117', borderRadius: '10px', p: 2 }}>
                <Typography sx={{ fontSize: 9, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>{L('IP Address','כתובת IP')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#e8f0f4', fontFamily: 'monospace' }}>{sigQuote.signedIP || '—'}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#0d1117', borderRadius: '10px', p: 2 }}>
                <Typography sx={{ fontSize: 9, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>{L('Status','סטטוס')}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>{L('Legally Signed','חתום משפטית')} ✅</Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: 10, color: '#78716C', mt: 2, lineHeight: 1.6 }}>
              {L(
                'This digital signature is legally binding. The signer approved the quote by typing their full name, drawing their signature, and confirming. Timestamp and IP address are recorded for legal purposes.',
                'חתימה דיגיטלית זו מחייבת משפטית. החותם אישר את ההצעה על ידי הקלדת שמו המלא, ציור חתימתו, ואישור. תאריך, שעה וכתובת IP נשמרו לצרכים משפטיים.'
              )}
            </Typography>
          </Box>
        )}
      </ModalBase>
    </Box>
  );
}
