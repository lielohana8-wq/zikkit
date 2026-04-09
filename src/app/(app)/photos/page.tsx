'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, Paper, Chip, IconButton, TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Grid } from '@mui/material';
import { CameraAlt, Compare, AutoAwesome, Download, Delete, Visibility } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/formatters';

interface PhotoSet { id: number; jobId: number; client: string; date: string; before: string[]; after: string[]; aiReport?: string; notes?: string }

export default function PhotosPage() {
  const { db } = useData();
  const { toast } = useToast();
  const [viewSet, setViewSet] = useState<PhotoSet | null>(null);
  const photoSets: PhotoSet[] = useMemo(() => (db.photoSets || []).sort((a: PhotoSet, b: PhotoSet) => new Date(b.date).getTime() - new Date(a.date).getTime()), [db.photoSets]);

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="תמונות לפני/אחרי" subtitle={`${photoSets.length} סטים`} />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 140, border: '1px solid rgba(0,0,0,0.06)' }}>
          <Typography variant="h4" fontWeight={900} sx={{ fontFamily: 'Syne', color: '#3B82F6' }}>{photoSets.length}</Typography>
          <Typography variant="caption" color="text.secondary">סטים</Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 140, border: '1px solid rgba(0,0,0,0.06)' }}>
          <Typography variant="h4" fontWeight={900} sx={{ fontFamily: 'Syne', color: '#10B981' }}>{photoSets.reduce((s, p) => s + p.before.length + p.after.length, 0)}</Typography>
          <Typography variant="caption" color="text.secondary">תמונות</Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 140, border: '1px solid rgba(0,0,0,0.06)' }}>
          <Typography variant="h4" fontWeight={900} sx={{ fontFamily: 'Syne', color: '#8B5CF6' }}>{photoSets.filter(p => p.aiReport).length}</Typography>
          <Typography variant="caption" color="text.secondary">דוחות AI</Typography>
        </Paper>
      </Box>

      {photoSets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><Typography fontSize={40}>📸</Typography><Typography fontWeight={700} sx={{ mt: 1 }}>אין תמונות עדיין</Typography><Typography variant="body2" color="text.secondary">טכנאים יעלו תמונות לפני/אחרי מהשטח</Typography></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {photoSets.map(ps => (
            <Paper key={ps.id} onClick={() => setViewSet(ps)} sx={{ borderRadius: 3, overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.06)', '&:hover': { borderColor: 'rgba(0,0,0,0.10)' } }}>
              <Box sx={{ display: 'flex', height: 120 }}>
                <Box sx={{ flex: 1, bgcolor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" fontSize={12}>{ps.before.length > 0 ? `${ps.before.length} לפני` : 'לפני'}</Typography>
                </Box>
                <Box sx={{ width: 2, bgcolor: 'rgba(0,0,0,0.08)' }} />
                <Box sx={{ flex: 1, bgcolor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary" fontSize={12}>{ps.after.length > 0 ? `${ps.after.length} אחרי` : 'אחרי'}</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 1.5 }}>
                <Typography fontWeight={600} fontSize={13}>{ps.client}</Typography>
                <Typography variant="caption" color="text.secondary">עבודה #{ps.jobId} · {formatDate(ps.date)}</Typography>
                {ps.aiReport && <Chip label="דוח AI" size="small" icon={<AutoAwesome sx={{ fontSize: 12 }} />} sx={{ mt: 0.5, fontSize: 10, bgcolor: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }} />}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <Dialog open={Boolean(viewSet)} onClose={() => setViewSet(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, direction: 'rtl' } }}>
        {viewSet && <>
          <DialogTitle>תמונות — {viewSet.client} (עבודה #{viewSet.jobId})</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1 }}><Typography fontWeight={700} fontSize={13} sx={{ mb: 1, color: '#EF4444' }}>לפני ({viewSet.before.length})</Typography>
                {viewSet.before.length === 0 && <Typography variant="body2" color="text.secondary">אין תמונות</Typography>}
              </Box>
              <Box sx={{ flex: 1 }}><Typography fontWeight={700} fontSize={13} sx={{ mb: 1, color: '#10B981' }}>אחרי ({viewSet.after.length})</Typography>
                {viewSet.after.length === 0 && <Typography variant="body2" color="text.secondary">אין תמונות</Typography>}
              </Box>
            </Box>
            {viewSet.aiReport && (
              <Paper sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <Typography fontWeight={700} fontSize={13} sx={{ mb: 1 }}>🤖 דוח AI</Typography>
                <Typography variant="body2" sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{viewSet.aiReport}</Typography>
              </Paper>
            )}
          </DialogContent>
          <DialogActions><Button onClick={() => setViewSet(null)}>סגור</Button></DialogActions>
        </>}
      </Dialog>
    </Box>
  );
}
