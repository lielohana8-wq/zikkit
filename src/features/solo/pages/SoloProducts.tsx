'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, TextField, InputAdornment, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from '@mui/material';
import { Add, Search, Edit, Delete, ContentCopy } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatMoney } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { newId } from '@/lib/data/collections';
import { useSolo } from '../useSolo';
import { SelectField } from '../components/SoloUI';
import type { Product, ProductCategory } from '@/types';

/**
 * Price book — the services and parts you sell, with their prices.
 * Quotes and receipts autocomplete from here, so a price only has to be
 * decided once.
 */
const CATEGORIES: Array<{ value: ProductCategory; label: string }> = [
  { value: 'service', label: 'Service' },
  { value: 'part', label: 'Part' },
  { value: 'labor', label: 'Labour' },
  { value: 'material', label: 'Material' },
  { value: 'other', label: 'Other' },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((x) => [x.value, x.label]));
const UNITS = ['job', 'hour', 'each', 'ft', 'sq ft', 'day'];

const STARTERS: Array<Partial<Product>> = [
  { name: 'Chimney sweep — single flue', category: 'service', unit: 'job', price: 250 },
  { name: 'Chimney inspection (Level 1)', category: 'service', unit: 'job', price: 180 },
  { name: 'Stainless chimney cap', category: 'part', unit: 'each', price: 450, cost: 220 },
  { name: 'Chimney liner (per foot)', category: 'material', unit: 'ft', price: 95, cost: 45 },
  { name: 'Garage door spring (pair)', category: 'part', unit: 'each', price: 320, cost: 130 },
  { name: 'Garage door opener install', category: 'service', unit: 'job', price: 480 },
  { name: 'Labour', category: 'labor', unit: 'hour', price: 110 },
  { name: 'Service call', category: 'service', unit: 'job', price: 89 },
];

interface Draft extends Partial<Product> { name: string }

export default function SoloProducts() {
  const { products, currency, saveProduct, deleteItem, quotes } = useSolo();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<string>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => (!cat || p.category === cat) && (!q || [p.name, p.desc, p.category].some((v) => (v || '').toLowerCase().includes(q))));
  }, [products, search, cat]);

  const grouped = useMemo(() => {
    const m = new Map<string, Product[]>();
    for (const p of list) { const k = p.category || 'other'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(p); }
    return Array.from(m.entries()).sort((a, b) => (CATEGORY_LABEL[a[0]] || a[0]).localeCompare(CATEGORY_LABEL[b[0]] || b[0]));
  }, [list]);

  /** How often an item has been quoted — tells you what actually sells. */
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of quotes) for (const it of q.items || []) m.set((it.name || '').toLowerCase(), (m.get((it.name || '').toLowerCase()) || 0) + 1);
    return m;
  }, [quotes]);

  const save = async () => {
    if (!draft?.name?.trim()) { toast('Name is required', '#ff4d6d'); return; }
    setSaving(true);
    try {
      const p: Product = {
        id: draft.id ?? newId(), name: draft.name.trim(), category: (draft.category || 'service') as ProductCategory,
        unit: draft.unit || 'job', price: Number(draft.price) || 0, cost: Number(draft.cost) || 0, desc: draft.desc || '',
      };
      await saveProduct(p);
      toast(draft.id ? 'Item updated' : 'Item added'); setDraft(null);
    } catch { /* provider toasts */ }
    finally { setSaving(false); }
  };

  const addStarters = async () => {
    setSaving(true);
    try {
      for (const s of STARTERS) await saveProduct({ id: newId(), name: s.name!, category: (s.category || 'service') as ProductCategory, unit: s.unit || 'job', price: s.price || 0, cost: s.cost || 0, desc: '' });
      toast('Starter price list added — edit the prices to match your rates');
    } finally { setSaving(false); }
  };

  const margin = (p: Product) => (p.price > 0 && p.cost > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : null);

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Price book" subtitle={`${products.length} item${products.length === 1 ? '' : 's'} · used to fill quotes and receipts`} actions={<Button variant="contained" startIcon={<Add />} onClick={() => setDraft({ name: '', category: 'service', unit: 'job', price: 0, cost: 0 })}>New item</Button>} />

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <TextField size="small" placeholder="Search the price book…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 200 }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        <Chip label="All" size="small" onClick={() => setCat('')} color={!cat ? 'primary' : 'default'} variant={!cat ? 'filled' : 'outlined'} />
        {CATEGORIES.map((x) => <Chip key={x.value} label={x.label} size="small" onClick={() => setCat(x.value)} color={cat === x.value ? 'primary' : 'default'} variant={cat === x.value ? 'filled' : 'outlined'} />)}
      </Stack>

      {products.length === 0 ? (
        <EmptyState icon="🏷️" title="No prices yet" subtitle="Add the services and parts you sell so quotes fill themselves in. Or start from a ready-made chimney and garage-door list and edit the prices." actionLabel="Add starter price list" onAction={addStarters} />
      ) : list.length === 0 ? (
        <Typography sx={{ color: c.text3, fontSize: 13, py: 4, textAlign: 'center' }}>Nothing matches that search.</Typography>
      ) : (
        grouped.map(([category, items]) => (
          <Box key={category} sx={{ mb: 2.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 12, color: c.text3, mb: 1 }}>{CATEGORY_LABEL[category] || category}</Typography>
            <Stack spacing={1}>
              {items.map((p) => {
                const m = margin(p); const used = usage.get(p.name.toLowerCase()) || 0;
                return (
                  <Paper key={p.id} sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${c.border}` }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDraft({ ...p })}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{p.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: c.text3 }}>
                          per {p.unit || 'job'}
                          {p.cost > 0 ? ` · cost ${formatMoney(p.cost, currency)}${m != null ? ` · ${m}% margin` : ''}` : ''}
                          {used > 0 ? ` · quoted ${used}×` : ''}
                        </Typography>
                        {p.desc && <Typography sx={{ fontSize: 12, color: c.text2 }}>{p.desc}</Typography>}
                      </Box>
                      <Typography sx={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap' }}>{formatMoney(p.price, currency)}</Typography>
                      <IconButton size="small" onClick={() => setDraft({ ...p, id: undefined, name: `${p.name} (copy)` })} title="Duplicate"><ContentCopy fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => setDraft({ ...p })}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => { if (confirm(`Remove "${p.name}" from the price book?`)) deleteItem('products', p.id); }}><Delete fontSize="small" /></IconButton>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        ))
      )}

      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="xs">
        <DialogTitle>{draft?.id ? 'Edit item' : 'New item'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} fullWidth autoFocus />
              <Stack direction="row" spacing={1.5}>
                <SelectField label="Category" value={(draft.category || 'service') as ProductCategory} onChange={(v) => setDraft({ ...draft, category: v })} options={CATEGORIES} size="medium" />
                <SelectField label="Unit" value={draft.unit || 'job'} onChange={(v) => setDraft({ ...draft, unit: v })} options={UNITS.map((u) => ({ value: u, label: `per ${u}` }))} size="medium" />
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <TextField label="Price" type="number" value={draft.price ?? ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
                <TextField label="Our cost" type="number" value={draft.cost ?? ''} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth helperText="Optional — shows margin" />
              </Stack>
              <TextField label="Description" value={draft.desc || ''} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} fullWidth multiline minRows={2} placeholder="What's included — appears nowhere unless you type it into a quote" />
              {(Number(draft.price) > 0 && Number(draft.cost) > 0) && (
                <>
                  <Divider />
                  <Typography sx={{ fontSize: 13 }}>Margin <b>{formatMoney(Number(draft.price) - Number(draft.cost), currency)}</b> ({Math.round(((Number(draft.price) - Number(draft.cost)) / Number(draft.price)) * 100)}%)</Typography>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
