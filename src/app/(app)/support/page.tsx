'use client';
import { useState } from 'react';
import { useL } from '@/hooks/useL';
import { Box, Typography, TextField, Button, Select, MenuItem } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/hooks/useToast';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export default function SupportPage() {
  const { db, saveData } = useData();
  const L = useL();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'general', message: '' });

  const tickets: Ticket[] = (db as Record<string, unknown>).tickets as Ticket[] || [];
  const statusColors: Record<string, string> = { open: c.blue, in_progress: c.warm, resolved: c.green };

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    const ticket: Ticket = {
      id: `t_${Date.now()}`,
      ...form,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await saveData({ ...db, tickets: [ticket, ...tickets] } as typeof db);
    toast('Ticket submitted! We will respond within 24 hours.');
    setForm({ subject: '', category: 'general', message: '' });
    setShowNew(false);
  };

  return (
    <Box sx={{ p: { xs: '16px', md: '24px 28px' }, animation: 'fadeUp 0.4s ease' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{L("Support","תמיכה")}</Typography>
          <Typography sx={{ fontSize: 13, color: c.text3 }}>Need help? We respond within 24 hours.</Typography>
        </Box>
        <Button onClick={() => setShowNew(true)} sx={{ bgcolor: c.accent, color: '#000', fontWeight: 700, fontSize: 12, px: 2.5, py: 1, borderRadius: '10px', textTransform: 'none' }}>{L("New Ticket","פנייה חדשה")}</Button>
      </Box>

      {showNew && (
        <Box sx={{ p: 3, borderRadius: '14px', bgcolor: c.surface2, border: `1px solid ${c.border}`, mb: 3 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>{L("New Support Ticket","פנייה חדשה")}</Typography>
          <TextField fullWidth placeholder={L("Subject","נושא")} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} size="small" sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: c.surface3, borderRadius: '10px', fontSize: 13 } }} />
          <Select fullWidth value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} size="small" sx={{ mb: 1.5, bgcolor: c.surface3, borderRadius: '10px', fontSize: 13 }}>
            <MenuItem value="general">{L('General','כללי')}</MenuItem>
            <MenuItem value="billing">{L('Billing','חיוב')}</MenuItem>
            <MenuItem value="bot">AI Voice Bot</MenuItem>
            <MenuItem value="bug">{L("Bug Report","דיווח באג")}</MenuItem>
            <MenuItem value="feature">{L("Feature Request","בקשת פיצר")}</MenuItem>
          </Select>
          <TextField fullWidth multiline rows={4} placeholder={L("Describe your issue...","תאר את הבעיה...")} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} size="small" sx={{ mb: 2, '& .MuiOutlinedInput-root': { bgcolor: c.surface3, borderRadius: '10px', fontSize: 13 } }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleSubmit} sx={{ bgcolor: c.accent, color: '#000', fontWeight: 700, fontSize: 12, px: 3, py: 1, borderRadius: '10px', textTransform: 'none' }}>{L("Submit","שלח")}</Button>
            <Button onClick={() => setShowNew(false)} sx={{ color: c.text3, fontSize: 12, textTransform: 'none' }}>{L('Cancel','ביטול')}</Button>
          </Box>
        </Box>
      )}

      {tickets.length === 0 && !showNew ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>🎧</Typography>
          <Typography sx={{ fontSize: 14, color: c.text3 }}>{L("No support tickets yet","אין פניות תמיכה")}</Typography>
        </Box>
      ) : tickets.map((t) => (
        <Box key={t.id} sx={{ p: '14px 16px', borderRadius: '12px', bgcolor: c.surface2, border: `1px solid ${c.border}`, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{t.subject}</Typography>
            <Box sx={{ px: 1, py: 0.3, borderRadius: '6px', fontSize: 10, fontWeight: 700, bgcolor: `${statusColors[t.status]}18`, color: statusColors[t.status] }}>{t.status.replace('_', ' ')}</Box>
          </Box>
          <Typography sx={{ fontSize: 12, color: c.text3 }}>{t.message.slice(0, 100)}{t.message.length > 100 ? '...' : ''}</Typography>
          <Typography sx={{ fontSize: 10, color: c.text4 || '#2e4050', mt: 0.5 }}>{new Date(t.createdAt).toLocaleDateString()}</Typography>
        </Box>
      ))}
    </Box>
  );
}
