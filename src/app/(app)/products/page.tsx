'use client';

import { useL } from '@/hooks/useL';
import { useLanguage } from '@/hooks/useLanguage';

import { useState, useMemo } from 'react';
import { Box, Button, TextField, Typography, Select, MenuItem } from '@mui/material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalBase } from '@/components/modals/ModalBase';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/formatters';
import { zikkitColors as c } from '@/styles/theme';
import type { Product, ProductCategory } from '@/types';

const CATEGORIES: { value: ProductCategory; label: string; he: string }[] = [
  { value: 'service', label: 'Service', he: 'שירות' },
  { value: 'part', label: 'Part', he: 'חלק' },
  { value: 'labor', label: 'Labor', he: 'עבודה' },
  { value: 'material', label: 'Material', he: 'חומר' },
  { value: 'other', label: 'Other', he: 'אחר' },
];

const CAT_BADGE: Record<string, 'new' | 'open' | 'warm' | 'purple' | 'grey'> = {
  service: 'new', part: 'open', labor: 'warm', material: 'purple', other: 'grey',
};

export default function ProductsPage() {
  const { db, saveData, cfg } = useData();
  const L = useL();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const products = useMemo(() => {
    let list = [...(db.products || [])];
    if (catFilter !== 'all') list = list.filter((p) => p.category === catFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.desc?.toLowerCase().includes(q));
    }
    return list;
  }, [db.products, search, catFilter]);

  const openNew = () => {
    setEditProduct({ name: '', category: 'service', unit: 'job', price: 0, cost: 0, desc: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editProduct.name?.trim()) { toast('Enter product name', c.hot); return; }
    const prods = [...(db.products || [])];
    if (editProduct.id) {
      const idx = prods.findIndex((p) => p.id === editProduct.id);
      if (idx >= 0) prods[idx] = editProduct as Product;
    } else {
      const maxId = prods.reduce((m, p) => Math.max(m, p.id || 0), 0);
      prods.push({ ...editProduct, id: maxId + 1 } as Product);
    }
    await saveData({ ...db, products: prods });
    setShowModal(false);
    toast(editProduct.id ? '✅ Product updated!' : '✅ Product added!');
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(L('Delete ','מחק ') + p.name + '?')) return;
    await saveData({ ...db, products: (db.products || []).filter((x) => x.id !== p.id) });
    toast('מוצר נמחק');
  };

  // Bulk price update
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPercent, setBulkPercent] = useState(0);
  const [bulkCategory, setBulkCategory] = useState<string>('all');

  const handleBulkPriceUpdate = async () => {
    if (bulkPercent === 0) { toast('Enter a percentage', c.hot); return; }
    const prods = [...(db.products || [])];
    let updated = 0;
    prods.forEach((p, idx) => {
      if (bulkCategory === 'all' || p.category === bulkCategory) {
        prods[idx] = { ...p, price: Math.round(p.price * (1 + bulkPercent / 100) * 100) / 100 };
        updated++;
      }
    });
    await saveData({ ...db, products: prods });
    setShowBulkModal(false);
    setBulkPercent(0);
    toast(`✅ Updated prices for ${updated} products`);
  };

  const handleExportCSV = () => {
    const header = 'Name,Category,Unit,Price,Cost,Description';
    const rows = (db.products || []).map((p) =>
      `"${p.name}","${p.category}","${p.unit}",${p.price},${p.cost},"${p.desc || ''}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('📥 CSV exported!');
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) { toast('CSV is empty', c.hot); return; }
        const prods = [...(db.products || [])];
        let maxId = prods.reduce((m, p) => Math.max(m, p.id || 0), 0);
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length < 4 || !cols[0]) continue;
          maxId++;
          prods.push({
            id: maxId, name: cols[0], category: (cols[1] || 'service') as ProductCategory,
            unit: cols[2] || 'job', price: parseFloat(cols[3]) || 0, cost: parseFloat(cols[4]) || 0,
            desc: cols[5] || '',
          });
          imported++;
        }
        await saveData({ ...db, products: prods });
        toast(`✅ Imported ${imported} products!`);
      } catch { toast('CSV parse error', c.hot); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const Label = ({ text }: { text: string }) => (
    <Box component="label" sx={{ fontSize: 10, fontWeight: 700, color: c.text3, mb: '7px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>{text}</Box>
  );

  return (
    <Box className="zk-fade-up" sx={{ animation: 'fadeIn 0.2s ease' }}>
      <PageTabs tabs={[{ label: 'מחירון', href: '/products', icon: '🏷️' }, { label: 'מלאי', href: '/inventory', icon: '📦' }]} />
      <SectionHeader title={L("Price List","מחירון")} subtitle={products.length + L(" products/services"," מוצרים/שירותים")} actions={
        <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={handleExportCSV} sx={{ fontSize: 10 }}>📥 Export CSV</Button>
          <Button variant="outlined" size="small" component="label" sx={{ fontSize: 10 }}>
            📤 Import CSV
            <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
          </Button>
          <Button variant="outlined" size="small" onClick={() => setShowBulkModal(true)} sx={{ fontSize: 10 }}>💰 Bulk Price</Button>
          <Button variant="contained" size="small" onClick={openNew}>{L('+ הוסף מוצר','+ הוסף מוצר')}</Button>
        </Box>
      } />

      <Box sx={{ display: 'flex', gap: '10px', mb: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 200 }} />
        {['all', ...CATEGORIES.map((c) => c.value)].map((cat) => (
          <Button key={cat} size="small" onClick={() => setCatFilter(cat)}
            sx={{ px: '10px', py: '4px', fontSize: 10, fontWeight: 700, borderRadius: '8px', minWidth: 'auto', textTransform: 'capitalize',
              bgcolor: catFilter === cat ? c.accentDim : c.glass2, color: catFilter === cat ? c.accent : c.text3,
              border: '1px solid ' + (catFilter === cat ? 'rgba(0,229,176,0.3)' : c.border2) }}>
            {cat === 'all' ? 'All' : cat}
          </Button>
        ))}
      </Box>

      {products.length === 0 ? (
        <EmptyState icon="📦" title={L("No Products","אין מוצרים")} subtitle={L("Add services and parts to your price list.","הוסף שירותים ומוצרים למחירון.")} actionLabel={L("+ Add Product","+ הוסף מוצר")} onAction={openNew} />
      ) : (
        <Box sx={{ bgcolor: c.surface2, border: '1px solid ' + c.border, borderRadius: '14px', overflow: 'hidden' }}>
          <DataTable<Product>
            keyExtractor={(p) => p.id}
            columns={[
              { key: 'image', label: '', width: 44, render: (p) => (
                <Box sx={{
                  width: 32, height: 32, borderRadius: '6px', overflow: 'hidden',
                  bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.055)', flexShrink: 0,
                }}>
                  {p.image ? (
                    <Box component="img" src={p.image} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Typography sx={{ fontSize: 14, opacity: 0.3 }}>📦</Typography>
                  )}
                </Box>
              )},
              { key: 'name', label: 'שם', render: (p) => <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{p.name}</Typography> },
              { key: 'category', label: L('Category','קטגוריה'), render: (p) => <Badge label={p.category} variant={CAT_BADGE[p.category] || 'grey'} /> },
              { key: 'unit', label: L('Unit','יחידה') },
              { key: 'price', label: L('Price','מחיר'), render: (p) => <Typography sx={{ fontWeight: 700, color: c.accent }}>{formatCurrency(p.price)}</Typography> },
              { key: 'cost', label: L('Cost','עלות'), render: (p) => formatCurrency(p.cost) },
              { key: 'margin', label: 'מרווח', render: (p) => {
                const margin = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
                return <Typography sx={{ color: margin > 50 ? c.green : margin > 20 ? c.warm : c.hot, fontWeight: 700, fontSize: 11 }}>{margin}%</Typography>;
              }},
              { key: 'actions', label: '', render: (p) => (
                <Button size="small" onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                  sx={{ fontSize: 10, minWidth: 'auto', p: '2px 8px', bgcolor: c.hotDim, color: c.hot, border: '1px solid rgba(255,77,109,0.2)', borderRadius: '6px' }}>✕</Button>
              ), width: 50 },
            ]}
            data={products}
            onRowClick={(p) => { setEditProduct({ ...p }); setShowModal(true); }}
          />
        </Box>
      )}

      <ModalBase open={showModal} onClose={() => setShowModal(false)} title={editProduct.id ? 'עריכת מוצר' : 'הוספת מוצר'}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button variant="contained" size="small" onClick={handleSave}>{editProduct.id ? 'עדכן' : 'הוסף מוצר'}</Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Image upload */}
          <Box><Label text={L("Product Image","תמונת מוצר")} />
            <Box sx={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Box sx={{
                width: 72, height: 72, borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
                bgcolor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {editProduct.image ? (
                  <Box component="img" src={editProduct.image} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Typography sx={{ fontSize: 28, opacity: 0.25 }}>📷</Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Button size="small" component="label" sx={{
                  fontSize: 10, p: '4px 12px', bgcolor: 'rgba(79,143,255,0.08)', color: '#4f8fff',
                  border: '1px solid rgba(79,143,255,0.2)', borderRadius: '6px',
                }}>
                  📤 Upload Image
                  <input type="file" accept="image/*" hidden onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 500 * 1024) { toast('Image must be under 500KB', '#ff4d6d'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setEditProduct({ ...editProduct, image: ev.target?.result as string });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
                </Button>
                {editProduct.image && (
                  <Button size="small" onClick={() => setEditProduct({ ...editProduct, image: undefined })} sx={{
                    fontSize: 10, p: '4px 12px', bgcolor: 'rgba(255,77,109,0.08)', color: '#ff4d6d',
                    border: '1px solid rgba(255,77,109,0.2)', borderRadius: '6px',
                  }}>
                    ✕ Remove
                  </Button>
                )}
                <Typography sx={{ fontSize: 9, color: '#5a7080' }}>PNG, JPG — max 500KB</Typography>
              </Box>
            </Box>
          </Box>
          <Box><Label text={L("Name *","שם *")} /><TextField fullWidth size="small" value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} placeholder={L("Service Call","ביקור שירות")} /></Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Category","קטגוריה")} />
              <Select fullWidth size="small" value={editProduct.category || 'service'} onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value as ProductCategory })}
                sx={{ bgcolor: c.surface3, borderRadius: '10px', fontSize: 13, '& fieldset': { borderColor: c.border2 } }}>
                {CATEGORIES.map((cat) => <MenuItem key={cat.value} value={cat.value}>{lang === 'he' ? cat.he : cat.label}</MenuItem>)}
              </Select>
            </Box>
            <Box><Label text={L("Unit","יחידה")} /><TextField fullWidth size="small" value={editProduct.unit || ''} onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })} placeholder="job / hour / unit" /></Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Box><Label text={L("Price ($)","מחיר")} /><TextField fullWidth size="small" type="number" value={editProduct.price || 0} onChange={(e) => setEditProduct({ ...editProduct, price: parseFloat(e.target.value) || 0 })} /></Box>
            <Box><Label text={L("Cost ($)","עלות")} /><TextField fullWidth size="small" type="number" value={editProduct.cost || 0} onChange={(e) => setEditProduct({ ...editProduct, cost: parseFloat(e.target.value) || 0 })} /></Box>
          </Box>
          {/* Live margin preview */}
          {(editProduct.price || 0) > 0 && (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '10px', p: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11, color: '#5a7080' }}>{L("Profit Margin","מרווח רווח")}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: ((editProduct.price! - (editProduct.cost || 0)) / editProduct.price!) * 100 > 50 ? '#22c55e' : '#f59e0b' }}>
                {Math.round(((editProduct.price! - (editProduct.cost || 0)) / editProduct.price!) * 100)}% ({formatCurrency(editProduct.price! - (editProduct.cost || 0))})
              </Typography>
            </Box>
          )}
          <Box><Label text={L("Description","תיאור")} /><TextField fullWidth size="small" multiline rows={2} value={editProduct.desc || ''} onChange={(e) => setEditProduct({ ...editProduct, desc: e.target.value })} placeholder="תיאור שירות..." /></Box>
        </Box>
      </ModalBase>

      {/* ── Bulk Price Update Modal ── */}
      <ModalBase open={showBulkModal} onClose={() => setShowBulkModal(false)} title={L("Bulk Price Update","עדכון מחירים מרובה")} maxWidth={420}
        footer={<>
          <Button variant="outlined" size="small" onClick={() => setShowBulkModal(false)}>{L('Cancel','ביטול')}</Button>
          <Button variant="contained" size="small" onClick={handleBulkPriceUpdate}>{L("Apply","החל")}</Button>
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box sx={{ bgcolor: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', p: '12px 16px', fontSize: 12, color: '#a8bcc8', lineHeight: 1.7 }}>
            💰 Adjust prices by a percentage. Positive values increase prices, negative values decrease them.
          </Box>
          <Box><Label text={L("Category","קטגוריה")} />
            <Select fullWidth size="small" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}
              sx={{ bgcolor: '#141920', borderRadius: '10px', fontSize: 13, '& fieldset': { borderColor: 'rgba(255,255,255,0.09)' } }}>
              <MenuItem value="all">{L("All Categories","כל הקטגוריות")}</MenuItem>
              {CATEGORIES.map((cat) => <MenuItem key={cat.value} value={cat.value}>{lang === 'he' ? cat.he : cat.label}</MenuItem>)}
            </Select>
          </Box>
          <Box><Label text={L("Price Change (%)","שינוי מחיר (%)")} />
            <TextField fullWidth size="small" type="number" value={bulkPercent} onChange={(e) => setBulkPercent(parseFloat(e.target.value) || 0)} placeholder={L("e.g. 10 for +10%","למשל: 10 ל-+10%")} />
          </Box>
          {bulkPercent !== 0 && (
            <Box sx={{ bgcolor: '#141920', borderRadius: '10px', p: '10px 14px', fontSize: 11, color: bulkPercent > 0 ? '#22c55e' : '#ff4d6d' }}>
              {bulkPercent > 0 ? '📈' : '📉'} Prices will {bulkPercent > 0 ? 'increase' : 'decrease'} by {Math.abs(bulkPercent)}%
              {bulkCategory !== 'all' ? ` for ${bulkCategory} products` : ' for all products'}
            </Box>
          )}
        </Box>
      </ModalBase>
    </Box>
  );
}
