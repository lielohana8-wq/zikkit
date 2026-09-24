'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Paper, Stack, Chip, Button, IconButton } from '@mui/material';
import { Navigation, Phone, MyLocation } from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { zikkitColors as c } from '@/styles/theme';
import { useSolo, toDateKey } from '../useSolo';
import { colorForUid } from '../roles';

/**
 * Live map — where the crew is right now.
 *
 * Positions come from the tiny `presence` document each technician's phone
 * writes once a minute, so the map updates itself through the same realtime
 * listener as everything else. Tiles are OpenStreetMap: no key, no billing.
 */
const TORONTO: [number, number] = [43.8828, -79.4403]; // Richmond Hill

interface Crew { uid: string; name: string; email?: string; phone?: string; color: string; lat?: number; lng?: number; ts?: string; active: boolean; accuracy?: number }

function minutesAgo(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}
const agoLabel = (m: number | null) => (m == null ? 'never' : m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`);

export default function SoloGps() {
  const { presence, team, jobs, technicians } = useSolo();
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const crew: Crew[] = useMemo(() => {
    const byUid = new Map(team.filter((t) => t.uid).map((t) => [t.uid as string, t]));
    const rows: Crew[] = [];
    for (const p of presence) {
      const member = byUid.get(p.uid);
      const mins = minutesAgo(p.lastGps?.ts || p.updated);
      rows.push({
        uid: p.uid, name: member?.name || p.name || p.email || 'Technician', email: member?.email || p.email, phone: member?.phone,
        color: colorForUid(p.uid, member?.color), lat: p.lastGps?.lat, lng: p.lastGps?.lng, ts: p.lastGps?.ts || p.updated,
        accuracy: p.lastGps?.accuracy, active: Boolean(p.isActive) && mins != null && mins < 15,
      });
    }
    // technicians who have never sent a position
    for (const t of technicians) if (t.uid && !rows.some((r) => r.uid === t.uid)) rows.push({ uid: t.uid, name: t.name, email: t.email, phone: t.phone, color: colorForUid(t.uid, t.color), active: false });
    return rows.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  }, [presence, team, technicians]);

  const located = useMemo(() => crew.filter((x) => x.lat != null && x.lng != null), [crew]);
  const today = toDateKey(new Date());
  const jobsToday = useMemo(() => jobs.filter((j) => j.scheduledDate === today && j.status !== 'cancelled'), [jobs, today]);

  // create the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !boxRef.current || mapRef.current) return;
      const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true }).setView(TORONTO, 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, []);

  // keep markers in sync with presence
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      if (cancelled || !map) return;
      const seen = new Set<string>();
      for (const x of located) {
        seen.add(x.uid);
        const html = `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${x.color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;opacity:${x.active ? 1 : 0.5}">
          <span style="transform:rotate(45deg);color:#fff;font:700 11px/1 Rubik,Arial">${(x.name || '?').slice(0, 2).toUpperCase()}</span></div>`;
        const icon = L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 26] });
        const existing = markersRef.current.get(x.uid);
        if (existing) { existing.setLatLng([x.lat!, x.lng!]); existing.setIcon(icon); }
        else {
          const m = L.marker([x.lat!, x.lng!], { icon }).addTo(map).on('click', () => setSelected(x.uid));
          markersRef.current.set(x.uid, m);
        }
        markersRef.current.get(x.uid)!.bindTooltip(`${x.name} · ${agoLabel(minutesAgo(x.ts))}`, { direction: 'top', offset: [0, -26] });
      }
      for (const [uid, m] of markersRef.current) if (!seen.has(uid)) { m.remove(); markersRef.current.delete(uid); }
      if (located.length > 0 && !selected) {
        const bounds = L.latLngBounds(located.map((x) => [x.lat!, x.lng!] as [number, number]));
        map.fitBounds(bounds.pad(0.35), { maxZoom: 14, animate: false });
      }
    })();
    return () => { cancelled = true; };
  }, [located, ready, selected]);

  const focus = (x: Crew) => {
    setSelected(x.uid);
    if (x.lat != null && x.lng != null) mapRef.current?.setView([x.lat, x.lng], 15, { animate: true });
  };

  return (
    <Box className="zk-fade-up">
      <SectionHeader title="Live map" subtitle={`${crew.filter((x) => x.active).length} of ${crew.length} on the road · ${jobsToday.length} job${jobsToday.length === 1 ? '' : 's'} today`}
        actions={located.length > 0 ? <Button size="small" startIcon={<MyLocation />} onClick={() => { setSelected(null); }}>Fit all</Button> : undefined} />

      {crew.length === 0 ? (
        <EmptyState icon="🗺️" title="Nobody to track yet" subtitle="Invite a technician from Team. Their phone shares its position while they're signed in and working." />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2 }}>
          <Stack spacing={1}>
            {crew.map((x) => {
              const mins = minutesAgo(x.ts);
              return (
                <Paper key={x.uid} onClick={() => focus(x)}
                  sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${selected === x.uid ? x.color : c.border}`, cursor: 'pointer', borderLeft: `4px solid ${x.color}` }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{x.name}</Typography>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: x.active ? '#059669' : '#9CA3AF' }} />
                      </Stack>
                      <Typography sx={{ fontSize: 11.5, color: c.text3 }}>{x.lat != null ? agoLabel(mins) : 'no position yet'}{x.accuracy ? ` · ±${Math.round(x.accuracy)}m` : ''}</Typography>
                    </Box>
                    {x.phone && <IconButton size="small" href={`tel:${x.phone}`} onClick={(e) => e.stopPropagation()}><Phone fontSize="small" /></IconButton>}
                    {x.lat != null && (
                      <IconButton size="small" component="a" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                        href={`https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}`}><Navigation fontSize="small" /></IconButton>
                    )}
                  </Stack>
                  {jobsToday.filter((j) => j.techUid === x.uid).slice(0, 3).map((j) => (
                    <Typography key={j.id} sx={{ fontSize: 11.5, color: c.text2, mt: 0.4 }}>{j.scheduledTime} · {j.client}{j.status === 'completed' ? ' ✓' : ''}</Typography>
                  ))}
                </Paper>
              );
            })}
            <Typography sx={{ fontSize: 11, color: c.text3 }}>Positions update about once a minute while a technician has the app open. Nothing is recorded as a trail — only the latest point.</Typography>
          </Stack>

          <Paper sx={{ borderRadius: 3, border: `1px solid ${c.border}`, overflow: 'hidden', position: 'relative', minHeight: 420 }}>
            <Box ref={boxRef} sx={{ position: 'absolute', inset: 0, '& .leaflet-container': { height: '100%', width: '100%', background: c.surface2 } }} />
            {located.length === 0 && (
              <Stack sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Chip label="Waiting for the first position" />
              </Stack>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
