'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, TextField, Chip, Paper, IconButton, Avatar, LinearProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Add, Edit, Delete, Warning, Inventory, LocalShipping, ShoppingCart } from '@mui/icons-material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { ModalBase } from '@/components/modals/ModalBase';
import { EmptyState } from '@/components/ui/EmptyState';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';

interface Part { id: number; name: string; sku: string; qty: number; minQty: number; cost: number; price: number; supplier: string; category: string; location: string }

export default function InventoryPage() {
  const { db, saveData, cfg } = useData();
  const { toast } = useToast();
  const currency = cfg.currency || 'ILS';
  const [search, setSearch] = useState('');
  const [editPart, setEditPart] = useState<Partial<Part>>({});
  const [showModal, setShowModal] = useState(false);
  const [catFilter, setCatFilter] = useState('all');

  const parts: Part[] = useMemo(() => {
    let list = db.inventory || [];
    if (catFilter !== 'all') list = list.filter((p: Part) => p.category === catFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter((p: Part) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)); }
    return list;
  }, [db.inventory, search, catFilter]);

  const categories = useMemo(() => [...new Set((db.inventory || []).map((p: Part) => p.category).filter(Boolean))], [db.inventory]);
  const lowStock = parts.filter(p => p.qty <= p.minQty);
  const totalValue = parts.reduce((s, p) => s + p.qty * p.cost, 0);

  const handleSave = async () => {
    if (!editPart.name) { toast('הכנס שם פריט'); return; }
    const list = [...(db.inventory || [])];
    if (editPart.id) { const idx = list.findIndex((p: Part) => p.id === editPart.id); if (idx >= 0) list[idx] = editPart as Part; }
    else list.push({ ...editPart, id: Math.max(0, ...list.map((p: Part) => p.id)) + 1 } as Part);
    await saveData({ ...db, inventory: list });
    setShowModal(false);
    toast('פריט נשמר');
  };

  const handleDelete = async (part: Part) => {
    if (!confirm('למחוק ' + part.name + '?')) return;
    await saveData({ ...db, inventory: (db.inventory || []).filter((p: Part) => p.id !== part.id) });
    toast('פריט נמחק');
  };

  return (
    <Box className="zk-fade-up">
      <PageTabs tabs={[{ label: 'מחירון', href: '/products', icon: '🏷️' }, { label: 'מלאי', href: '/inventory', icon: '📦' }]} />
      <SectionHeader title="מלאי וחלקים" subtitle={`${parts.length} פריטים · שווי ${formatCurrency(totalValue, currency)}`} actions={
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setEditPart({ name: '', sku: '', qty: 0, minQty: 5, cost: 0, price: 0, supplier: '', category: '', location: '' }); setShowModal(true); }} sx={{ bgcolor: '#F59E0B' }}>פריט חדש</Button>
      } />

      {lowStock.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Warning sx={{ color: '#EF4444' }} />
          <Box><Typography fontWeight={700} fontSize={13} sx={{ color: '#EF4444' }}>⚠ {lowStock.length} פריטים במלאי נמוך</Typography>
            <Typography variant="caption" color="text.secondary">{lowStock.map(p => p.name).join(', ')}</Typography>
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ minWidth: 200 }} />
        <Select value={catFilter} onChange={e => setCatFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
          <MenuItem value="all">כל הקטגוריות</MenuItem>
          {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </Box>

      {parts.length === 0 ? <EmptyState icon="📦" title="אין פריטי מלאי" subtitle="הוסף את הפריט הראשון" actionLabel="+ פריט חדש" onAction={() => { setEditPart({}); setShowModal(true); }} /> : (
        <Box sx={{ bgcolor: '#FAF7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable keyExtractor={(p: Part) => p.id} data={parts} onRowClick={(p: Part) => { setEditPart(p); setShowModal(true); }} columns={[
            { key: 'name', label: 'פריט', render: (p: Part) => <Box><Typography fontWeight={600} fontSize={12}>{p.name}</Typography><Typography variant="caption" color="text.secondary">{p.sku}</Typography></Box> },
            { key: 'category', label: 'קטגוריה', render: (p: Part) => p.category || '—' },
            { key: 'qty', label: 'כמות', render: (p: Part) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontWeight={700} fontSize={12} sx={{ color: p.qty <= p.minQty ? '#EF4444' : '#10B981' }}>{p.qty}</Typography>
                {p.qty <= p.minQty && <Chip label="נמוך" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 9, height: 18 }} />}
              </Box>
            )},
            { key: 'cost', label: 'עלות', render: (p: Part) => formatCurrency(p.cost, currency) },
            { key: 'price', label: 'מחיר', render: (p: Part) => formatCurrency(p.price, currency) },
            { key: 'supplier', label: 'ספק', render: (p: Part) => p.supplier || '—' },
            { key: 'actions', label: '', width: 50, render: (p: Part) => <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(p); }}><Delete sx={{ fontSize: 14, color: '#EF4444' }} /></IconButton> },
          ]} />
        </Box>
      )}

      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editPart.id ? 'עריכת פריט' : 'פריט חדש'} footer={<><Button variant="outlined" size="small" onClick={() => setShowModal(false)}>ביטול</Button><Button variant="contained" size="small" onClick={handleSave} sx={{ bgcolor: '#F59E0B' }}>שמור</Button></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="שם" value={editPart.name || ''} onChange={e => setEditPart({ ...editPart, name: e.target.value })} fullWidth size="small" />
          <Box sx={{ display: 'flex', gap: 2 }}><TextField label="SKU" value={editPart.sku || ''} onChange={e => setEditPart({ ...editPart, sku: e.target.value })} fullWidth size="small" /><TextField label="קטגוריה" value={editPart.category || ''} onChange={e => setEditPart({ ...editPart, category: e.target.value })} fullWidth size="small" /></Box>
          <Box sx={{ display: 'flex', gap: 2 }}><TextField label="כמות" type="number" value={editPart.qty || 0} onChange={e => setEditPart({ ...editPart, qty: parseInt(e.target.value) || 0 })} size="small" /><TextField label="מינימום" type="number" value={editPart.minQty || 0} onChange={e => setEditPart({ ...editPart, minQty: parseInt(e.target.value) || 0 })} size="small" /></Box>
          <Box sx={{ display: 'flex', gap: 2 }}><TextField label="עלות" type="number" value={editPart.cost || 0} onChange={e => setEditPart({ ...editPart, cost: parseFloat(e.target.value) || 0 })} size="small" /><TextField label="מחיר מכירה" type="number" value={editPart.price || 0} onChange={e => setEditPart({ ...editPart, price: parseFloat(e.target.value) || 0 })} size="small" /></Box>
          <Box sx={{ display: 'flex', gap: 2 }}><TextField label="ספק" value={editPart.supplier || ''} onChange={e => setEditPart({ ...editPart, supplier: e.target.value })} fullWidth size="small" /><TextField label="מיקום" value={editPart.location || ''} onChange={e => setEditPart({ ...editPart, location: e.target.value })} fullWidth size="small" /></Box>
        </Box>
      </ModalBase>
    </Box>
  );
}
