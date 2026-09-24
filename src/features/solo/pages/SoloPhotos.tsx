'use client';
import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, Stack, Chip, Dialog, DialogContent, IconButton, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { Search, Close, Download, AddAPhoto, Delete } from '@mui/icons-material';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { formatDateLocal, formatMoney } from '@/lib/region';
import { useToast } from '@/hooks/useToast';
import { useSolo } from '../useSolo';
import { isFieldRole } from '../roles';
import { readResizedPhotos } from '../photos';

/**
 * Job photos — everything shot on site, grouped by the job it belongs to.
 * Photos taken while closing a job land here automatically; you can add more
 * to any job afterwards.
 */
interface Album { key: string; title: string; subtitle: string; date: string; photos: string[]; jobId?: number; closingId?: number; amount?: number }

export default function SoloPhotos() {
  const { jobs, closings, currency, saveJob, saveClosing, role } = useSolo();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [viewer, setViewer] = useState<{ album: Album; index: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const isTech = isFieldRole(role);

  const albums = useMemo(() => {
    const out: Album[] = [];
    for (const x of closings) {
      if (!x.photos?.length) continue;
      out.push({ key: `c-${x.id}`, title: x.client, subtitle: `${x.jobType}${x.techName ? ` · ${x.techName}` : ''}`, date: x.date, photos: x.photos, closingId: x.id, jobId: x.jobId, amount: x.amount });
    }
    for (const j of jobs) {
      if (!j.photos?.length) continue;
      if (out.some((a) => a.jobId === j.id)) continue; // already shown through its closing
      out.push({ key: `j-${j.id}`, title: j.client, subtitle: j.jobType || j.desc || 'Job', date: j.scheduledDate || (j.created || '').slice(0, 10), photos: j.photos, jobId: j.id });
    }
    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [jobs, closings]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? albums.filter((a) => [a.title, a.subtitle].some((v) => v.toLowerCase().includes(q))) : albums;
  }, [albums, search]);

  const totalPhotos = albums.reduce((s, a) => s + a.photos.length, 0);
  /** Jobs finished in the last month with nothing shot — the ones worth chasing. */
  const missing = useMemo(() => closings.filter((x) => !x.photos?.length && x.date >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).length, [closings]);

  const addTo = async (album: Album, files: FileList | null) => {
    if (!files?.length) return;
    setBusy(album.key);
    try {
      const shots = await readResizedPhotos(files);
      if (album.closingId != null) {
        const x = closings.find((k) => k.id === album.closingId);
        if (x) await saveClosing({ ...x, photos: [...(x.photos || []), ...shots] });
      } else if (album.jobId != null) {
        const j = jobs.find((k) => k.id === album.jobId);
        if (j) await saveJob({ ...j, photos: [...(j.photos || []), ...shots] });
      }
      toast(`${shots.length} photo${shots.length === 1 ? '' : 's'} added`);
    } catch (e) { toast((e as Error).message || 'Could not add the photos', '#ff4d6d'); }
    finally { setBusy(null); }
  };

  const removeFrom = async (album: Album, index: number) => {
    if (!confirm('Delete this photo?')) return;
    const keep = album.photos.filter((_, i) => i !== index);
    if (album.closingId != null) {
      const x = closings.find((k) => k.id === album.closingId);
      if (x) await saveClosing({ ...x, photos: keep });
    } else if (album.jobId != null) {
      const j = jobs.find((k) => k.id === album.jobId);
      if (j) await saveJob({ ...j, photos: keep });
    }
    setViewer(null); toast('Photo deleted');
  };

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Photos" subtitle={`${totalPhotos} photo${totalPhotos === 1 ? '' : 's'} across ${albums.length} job${albums.length === 1 ? '' : 's'}`} />

      {missing > 0 && !isTech && (
        <Paper sx={{ p: 1.5, borderRadius: 3, mb: 2, border: `1px solid ${c.border}`, bgcolor: c.surface2 }}>
          <Typography sx={{ fontSize: 12.5, color: c.text2 }}>{missing} job{missing === 1 ? '' : 's'} closed in the last month with no photos. Before-and-after shots settle disputes and sell the next job.</Typography>
        </Paper>
      )}

      {albums.length > 0 && (
        <TextField size="small" fullWidth placeholder="Search by customer or job…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
      )}

      {list.length === 0 ? (
        <EmptyState icon="📷" title={albums.length === 0 ? 'No photos yet' : 'Nothing matches'} subtitle="Photos you take while closing a job show up here, grouped by job." />
      ) : (
        <Stack spacing={2}>
          {list.map((a) => (
            <Paper key={a.key} sx={{ p: 2, borderRadius: 3, border: `1px solid ${c.border}` }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{a.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: c.text3 }}>{a.subtitle} · {formatDateLocal(a.date)}{a.amount ? ` · ${formatMoney(a.amount, currency)}` : ''}</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={`${a.photos.length}`} />
                  <Button component="label" size="small" startIcon={busy === a.key ? <CircularProgress size={14} /> : <AddAPhoto />} disabled={busy === a.key}>
                    Add
                    <input hidden type="file" accept="image/*" multiple capture="environment" onChange={(e) => { addTo(a, e.target.files); e.target.value = ''; }} />
                  </Button>
                </Stack>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)', md: 'repeat(7, 1fr)' }, gap: 1 }}>
                {a.photos.map((src, i) => (
                  <Box key={i} component="img" src={src} alt="" loading="lazy" onClick={() => setViewer({ album: a, index: i })}
                    sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 2, cursor: 'pointer', border: `1px solid ${c.border}`, transition: 'transform .12s', '&:hover': { transform: 'scale(1.03)' } }} />
                ))}
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={!!viewer} onClose={() => setViewer(null)} maxWidth="md" fullWidth>
        {viewer && (
          <DialogContent sx={{ p: 0, bgcolor: '#111', position: 'relative' }}>
            <Box component="img" src={viewer.album.photos[viewer.index]} alt="" sx={{ width: '100%', maxHeight: '78vh', objectFit: 'contain', display: 'block' }} />
            <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 8, right: 8 }}>
              <IconButton size="small" sx={{ bgcolor: 'rgba(0,0,0,.5)', color: '#fff' }} component="a" href={viewer.album.photos[viewer.index]} download={`${viewer.album.title}-${viewer.index + 1}.jpg`}><Download fontSize="small" /></IconButton>
              {!isTech && <IconButton size="small" sx={{ bgcolor: 'rgba(0,0,0,.5)', color: '#fff' }} onClick={() => removeFrom(viewer.album, viewer.index)}><Delete fontSize="small" /></IconButton>}
              <IconButton size="small" sx={{ bgcolor: 'rgba(0,0,0,.5)', color: '#fff' }} onClick={() => setViewer(null)}><Close fontSize="small" /></IconButton>
            </Stack>
            {viewer.album.photos.length > 1 && (
              <Stack direction="row" justifyContent="space-between" sx={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', px: 1 }}>
                <Button sx={{ color: '#fff', minWidth: 44 }} onClick={() => setViewer({ ...viewer, index: (viewer.index - 1 + viewer.album.photos.length) % viewer.album.photos.length })}>‹</Button>
                <Button sx={{ color: '#fff', minWidth: 44 }} onClick={() => setViewer({ ...viewer, index: (viewer.index + 1) % viewer.album.photos.length })}>›</Button>
              </Stack>
            )}
            <Typography sx={{ position: 'absolute', bottom: 8, left: 12, color: '#fff', fontSize: 12, opacity: .85 }}>{viewer.album.title} · {viewer.index + 1}/{viewer.album.photos.length}</Typography>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}
