'use client';
import { useL } from '@/hooks/useL';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, IconButton, InputAdornment, Menu, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Quote, QuoteItem, QuoteStatus } from '@/types';

const STATUS_MAP: Record<string, 'new' | 'open' | 'done' | 'hot' | 'grey'> = {
  draft: 'grey', sent: 'open', accepted: 'done', declined: 'hot', expired: 'grey',
};

export default function TechQuotesPage() {
  const { user } = useAuth();
  const L = useL();
  const { db, saveData, cfg } = useData();
  const { toast } = useToast();
  const currency = cfg.currency || 'USD';
  const taxRate = cfg.tax_rate || 0;
  const techName = user?.name || '';

  const [showModal, setShowModal] = useState(false);
  const [editQuote, setEditQuote] = useState<Partial<Quote>>({});
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuQuote, setMenuQuote] = useState<Quote | null>(null);

  const myQuotes = useMemo(() => {
    let list = (db.quotes || []).filter((q) => q.tech === techName || q.createdBy === techName);
    if (statusFilter !== 'all') list = list.filter((q) => q.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((q) => q.client?.toLowerCase().includes(s) || q.phone?.includes(s));
    }
    return list.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
  }, [db.quotes, techName, search, statusFilter]);

  const products = db.products || [];
  const totalQuoted = myQuotes.reduce((s, q) => s + (q.total || 0), 0);
  const accepted = myQuotes.filter((q) => q.status === 'accepted');
  const acceptedValue = accepted.reduce((s, q) => s + (q.total || 0), 0);

  const openNew = () => {
    setEditQuote({ client: '', phone: '', email: '', address: '', status: 'draft', notes: '', tech: techName, createdBy: techName });
    setItems([{ id: 1, name: '', qty: 1, price: 0 }]);
    setShowModal(true);
  };

  const addItem = () => {
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
    setItems([...items, { id: maxId + 1, name: '', qty: 1, price: 0 }]);
  };

  const removeItem = (id: number) => { if (items.length > 1) setItems(items.filter((i) => i.id !== id)); };

  const updateItem = (id: number, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleSave = async () => {
    if (!editQuote.client) { toast('נדרש שם לקוח'); return; }
    if (items.every((i) => !i.name)) { toast('הוסף לפחות פריט אחד'); return; }
    const quotesList = [...(db.quotes || [])];
    const quoteData: Quote = {
      ...editQuote as Quote,
      items: items.filter((i) => i.name),
      subtotal, tax, total,
      tech: techName,
      createdBy: techName,
    };
    if (editQuote.id) {
      const idx = quotesList.findIndex((q) => q.id === editQuote.id);
      if (idx >= 0) quotesList[idx] = { ...quotesList[idx], ...quoteData };
    } else {
      quoteData.id = Date.now();
      quoteData.created = new Date().toISOString();
      quotesList.push(quoteData);
    }
    await saveData({ ...db, quotes: quotesList });
    toast(editQuote.id ? 'Quote updated!' : '✅ Quote created!');
    setShowModal(false);
  };

  const handleSendWhatsApp = (q: Quote) => {
    const phone = (q.phone || '').replace(/\D/g, '');
    if (!phone) { toast('אין מספר טלפון'); return; }
    const msg = `Hi ${q.client},\nHere is your quote from ${cfg.business_name || 'us'}:\n\n${(q.items || []).map((i) => `• ${i.name} x${i.qty} — ${formatCurrency(i.qty * i.price, currency)}`).join('\n')}\n\nTotal: ${formatCurrency(q.total || 0, currency)}\n\nThank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setMenuAnchor(null); setMenuQuote(null);
  };

  const handleStatusChange = async (q: Quote, status: QuoteStatus) => {
    const list = [...(db.quotes || [])];
    const idx = list.findIndex((x) => x.id === q.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], status };
      await saveData({ ...db, quotes: list });
      toast('סטטוס עודכן');
    }
    setMenuAnchor(null); setMenuQuote(null);
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: '#78716C', mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <SectionHeader title="ההצעות שלי" subtitle="צור ונהל הצעות מחיר בשטח" />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px', mb: '16px' }}>
        <KpiCard label={L("My Quotes","ההצעות שלי")} value={String(myQuotes.length)} variant="blue" />
        <KpiCard label={L("Total Quoted","סה\"כ הוצע")} value={formatCurrency(totalQuoted, currency)} variant="teal" />
        <KpiCard label={L("Accepted","אושרו")} value={String(accepted.length)} variant="green" />
        <KpiCard label={L("Accepted Value","ערך שאושר")} value={formatCurrency(acceptedValue, currency)} variant="accent" />
      </Box>

      <Box sx={{ display: 'flex', gap: '10px', mb: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="small" onClick={openNew} sx={{
          px: '14px', py: '6px', fontSize: 11, fontWeight: 700, borderRadius: '10px',
          bgcolor: 'rgba(79,70,229,0.08)', color: '#4F46E5', border: '1px solid rgba(0,229,176,0.2)',
          '&:hover': { bgcolor: '#4F46E5', color: '#000' },
        }}>
          + הצעת מחיר חדשה
        </Button>
        <TextField placeholder="חיפוש הצעות מחיר..." value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 200 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#78716C' }} /></InputAdornment> }} />
        {['all', 'draft', 'sent', 'accepted', 'declined'].map((s) => (
          <Button key={s} size="small" onClick={() => setStatusFilter(s)} sx={{
            px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
            bgcolor: statusFilter === s ? 'rgba(79,70,229,0.08)' : 'rgba(0,0,0,0.03)',
            color: statusFilter === s ? '#4F46E5' : '#78716C',
            border: '1px solid ' + (statusFilter === s ? 'rgba(79,70,229,0.25)' : 'rgba(0,0,0,0.08)'),
          }}>
            {s === 'all' ? 'הכל' : s}
          </Button>
        ))}
      </Box>

      {myQuotes.length === 0 ? (
        <EmptyState icon="📄" title="אין הצעות מחיר" subtitle="צור את הצעת המחיר הראשונה שלך." />
      ) : (
        <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<Quote>
            keyExtractor={(q) => String(q.id)}
            columns={[
              { key: 'client', label: 'לקוח', render: (q) => <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{q.client}</Typography> },
              { key: 'phone', label: 'טלפון', render: (q) => q.phone || '—' },
              { key: 'items', label: 'פריטים', render: (q) => String((q.items || []).length) + ' פריטים' },
              { key: 'total', label: 'סה"כ', render: (q) => <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#4F46E5' }}>{formatCurrency(q.total || 0, currency)}</Typography> },
              { key: 'status', label: 'סטטוס', render: (q) => <Badge label={q.status} variant={STATUS_MAP[q.status] || 'grey'} /> },
              { key: 'created', label: 'תאריך', render: (q) => formatDate(q.created) },
              { key: 'actions', label: '', width: 80, render: (q) => (
                <Button size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuQuote(q); }}
                  sx={{ fontSize: 11, minWidth: 'auto', p: '3px 10px', bgcolor: 'rgba(0,0,0,0.03)', color: '#A8A29E', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px' }}>
                  ⋮
                </Button>
              )},
            ]}
            data={myQuotes}
          />
        </Box>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuQuote(null); }}
        PaperProps={{ sx: { bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', minWidth: 180 } }}>
        <MenuItem onClick={() => { if (menuQuote) handleSendWhatsApp(menuQuote); }}
          sx={{ fontSize: 12, gap: '8px', color: '#25d366', '&:hover': { bgcolor: 'rgba(37,211,102,0.08)' } }}>
          💬 Send via WhatsApp
        </MenuItem>
        <MenuItem onClick={() => { if (menuQuote) handleStatusChange(menuQuote, 'sent'); }}
          sx={{ fontSize: 12, gap: '8px', color: '#4f8fff', '&:hover': { bgcolor: 'rgba(79,143,255,0.08)' } }}>
          📤 סמן כנשלח
        </MenuItem>
        <MenuItem onClick={() => { if (menuQuote) handleStatusChange(menuQuote, 'accepted'); }}
          sx={{ fontSize: 12, gap: '8px', color: '#22c55e', '&:hover': { bgcolor: 'rgba(34,197,94,0.08)' } }}>
          ✅ Mark Accepted
        </MenuItem>
        <MenuItem onClick={() => { if (menuQuote) handleStatusChange(menuQuote, 'declined'); }}
          sx={{ fontSize: 12, gap: '8px', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}>
          ❌ Mark Declined
        </MenuItem>
      </Menu>

      {/* Create Quote Modal */}
      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editQuote.id ? 'עריכת הצעת מחיר' : 'הצעת מחיר חדשה'}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button size="small" onClick={handleSave}
            sx={{ bgcolor: 'rgba(0,229,176,0.1)', color: '#4F46E5', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', fontWeight: 700, '&:hover': { bgcolor: '#4F46E5', color: '#000' } }}>
            💾 {editQuote.id ? 'עדכן' : 'צור'} הצעה
          </Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Client Name *","שם לקוח *")} /><TextField fullWidth size="small" value={editQuote.client || ''} onChange={(e) => setEditQuote({ ...editQuote, client: e.target.value })} /></Box>
            <Box><Label text={L("Phone","טלפון")} /><TextField fullWidth size="small" value={editQuote.phone || ''} onChange={(e) => setEditQuote({ ...editQuote, phone: e.target.value })} /></Box>
          </Box>
          <Box><Label text={L("Address","כתובת")} /><TextField fullWidth size="small" value={editQuote.address || ''} onChange={(e) => setEditQuote({ ...editQuote, address: e.target.value })} /></Box>

          <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', p: '12px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '10px' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#A8A29E' }}>{L("Line Items","פריטים")}</Typography>
              <Button size="small" onClick={addItem} sx={{ fontSize: 10, color: '#4F46E5', minWidth: 'auto' }}>+ Add</Button>
            </Box>
            {items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', gap: '8px', mb: '8px', alignItems: 'center' }}>
                <TextField select size="small" value={item.name} onChange={(e) => {
                  const p = products.find((p) => p.name === e.target.value);
                  updateItem(item.id, 'name', e.target.value);
                  if (p) updateItem(item.id, 'price', p.price);
                }} sx={{ flex: 2 }} SelectProps={{ native: true }}>
                  <option value="">Select product...</option>
                  {products.map((p) => <option key={p.id} value={p.name}>{p.name} — {formatCurrency(p.price, currency)}</option>)}
                </TextField>
                <TextField size="small" type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)} sx={{ width: 60 }} />
                <TextField size="small" type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} sx={{ width: 90 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', minWidth: 70, textAlign: 'right' }}>{formatCurrency(item.qty * item.price, currency)}</Typography>
                <IconButton size="small" onClick={() => removeItem(item.id)} sx={{ color: '#ef4444', opacity: 0.6 }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
              </Box>
            ))}
            <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.06)', pt: '10px', mt: '6px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 11, color: '#78716C' }}>{L("Subtotal","סיכום ביניים")}</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{formatCurrency(subtotal, currency)}</Typography>
              </Box>
              {taxRate > 0 && <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 11, color: '#78716C' }}>Tax ({taxRate}%)</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{formatCurrency(tax, currency)}</Typography>
              </Box>}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: '6px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{L("Total","סה\"כ")}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#4F46E5' }}>{formatCurrency(total, currency)}</Typography>
              </Box>
            </Box>
          </Box>

          <Box><Label text={L("Notes","הערות")} /><TextField fullWidth size="small" multiline rows={2} value={editQuote.notes || ''} onChange={(e) => setEditQuote({ ...editQuote, notes: e.target.value })} /></Box>
        </Box>
      </ModalBase>
    </Box>
  );
}
