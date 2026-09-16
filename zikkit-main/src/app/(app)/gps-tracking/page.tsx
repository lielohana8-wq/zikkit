'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, Chip, Avatar, Button } from '@mui/material';
import { PageTabs } from '@/components/ui/PageTabs';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { useData } from '@/hooks/useFirestore';
import { useL } from '@/hooks/useL';
import { zikkitColors as c } from '@/styles/theme';
import type { User } from '@/types/user';
import type { Job } from '@/types/job';

const TECH_COLORS = ['#4F46E5','#059669','#D97706','#7C3AED','#E11D48','#0D9488','#EC4899','#84CC16'];
function tColor(i: number) { return TECH_COLORS[i % TECH_COLORS.length]; }

export default function GPSTrackingPage() {
  const { db } = useData();
  const L = useL();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const techs = useMemo(() => (db.users || []).filter((u: User) => u.role === 'tech' || u.role === 'technician'), [db.users]);
  const jobs = useMemo(() => db.jobs || [], [db.jobs]);

  // Build tech locations from GPS checkins or job addresses
  const techLocations = useMemo(() => {
    return techs.map((tech, i) => {
      const techJobs = jobs.filter((j: Job) => j.tech === tech.name);
      const lastCheckin = (tech as any).lastGps || (techJobs[0]?.gpsCheckins?.slice(-1)[0]);
      // Default: Jerusalem area with slight offset per tech
      const lat = lastCheckin?.lat || 31.77 + (i * 0.008);
      const lng = lastCheckin?.lng || 35.21 + (i * 0.005);
      const activeJob = techJobs.find((j: Job) => j.status === 'in_progress');
      return { name: tech.name, lat, lng, color: tColor(i), activeJob, jobCount: techJobs.filter((j: Job) => j.status !== 'completed' && j.status !== 'cancelled').length };
    });
  }, [techs, jobs]);

  // Load Leaflet from CDN and init map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    // Add CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }
    // Add JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => {
      if (!mapRef.current || leafletMap.current) return;
      const L2 = (window as any).L;
      const map = L2.map(mapRef.current).setView([31.77, 35.21], 12);
      L2.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);
      leafletMap.current = map;
      // Force resize after render
      setTimeout(() => map.invalidateSize(), 200);
    };
    document.head.appendChild(script);
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  // Update markers when tech locations change
  useEffect(() => {
    if (!leafletMap.current) return;
    const L2 = (window as any).L;
    if (!L2) return;
    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    // Add new markers
    techLocations.forEach((t) => {
      if (selectedTech && t.name !== selectedTech) return;
      const icon = L2.divIcon({
        className: '',
        html: '<div style="width:32px;height:32px;border-radius:50%;background:' + t.color + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">' + t.name.slice(0, 2) + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L2.marker([t.lat, t.lng], { icon }).addTo(leafletMap.current);
      marker.bindPopup('<div dir="rtl" style="font-family:Rubik,sans-serif;min-width:140px;"><strong>' + t.name + '</strong><br/>' + (t.activeJob ? '🔧 ' + t.activeJob.client : '📍 זמין') + '<br/>' + t.jobCount + ' עבודות פתוחות</div>');
      markersRef.current.push(marker);
    });
    // Fit bounds
    if (markersRef.current.length > 0) {
      const group = L2.featureGroup(markersRef.current);
      leafletMap.current.fitBounds(group.getBounds().pad(0.2));
    }
  }, [techLocations, selectedTech]);

  return (
    <Box className="zk-fade-up">
      <PageTabs tabs={[{ label: L('GPS Tracking', 'מעקב GPS'), href: '/gps-tracking', icon: '🗺️' }]} />
      <SectionHeader title={L('GPS Tracking', 'מעקב GPS')} subtitle={L('Real-time technician locations', 'מיקום טכנאים בזמן אמת')} />

      <Box sx={{ px: '20px', pb: '20px' }}>
        {/* Tech filter chips */}
        <Box sx={{ display: 'flex', gap: '6px', mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label={L('All', 'הכל') + ' ' + techs.length}
            onClick={() => setSelectedTech(null)}
            size="small"
            sx={{ fontWeight: !selectedTech ? 700 : 400, bgcolor: !selectedTech ? c.accentDim : 'transparent', color: !selectedTech ? c.accent : c.text3, border: '1px solid ' + (!selectedTech ? c.accent + '40' : c.border) }}
          />
          {techs.map((tech, i) => (
            <Chip
              key={String(tech.id)}
              label={tech.name}
              onClick={() => setSelectedTech(selectedTech === tech.name ? null : tech.name)}
              size="small"
              avatar={<Avatar sx={{ width: 20, height: 20, bgcolor: tColor(i), fontSize: 9, fontWeight: 700 }}>{tech.name.slice(0, 2)}</Avatar>}
              sx={{ fontWeight: selectedTech === tech.name ? 700 : 400, bgcolor: selectedTech === tech.name ? tColor(i) + '15' : 'transparent', border: '1px solid ' + (selectedTech === tech.name ? tColor(i) + '40' : c.border) }}
            />
          ))}
        </Box>

        {/* Map */}
        <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid ' + c.border, bgcolor: c.surface1 }}>
          <Box ref={mapRef} sx={{ width: '100%', height: { xs: 350, md: 500 } }} />
        </Box>

        {/* Tech list below map */}
        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: '10px' }}>
          {techLocations.map((t, i) => (
            <Box key={t.name} onClick={() => setSelectedTech(t.name)} sx={{
              p: '12px 14px', borderRadius: '10px', bgcolor: c.surface1, border: '1px solid ' + c.border,
              borderRight: '3px solid ' + t.color, cursor: 'pointer', transition: 'all 0.15s',
              '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '4px' }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: t.color, fontSize: 9, fontWeight: 700 }}>{t.name.slice(0, 2)}</Avatar>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.text }}>{t.name}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip label={t.activeJob ? 'בטיפול' : 'זמין'} size="small" sx={{ height: 18, fontSize: 9, fontWeight: 600, bgcolor: t.activeJob ? c.warmDim : c.greenDim, color: t.activeJob ? c.warm : c.green }} />
              </Box>
              {t.activeJob && <Typography sx={{ fontSize: 11, color: c.text3 }}>🔧 {t.activeJob.client} — {t.activeJob.address || ''}</Typography>}
              <Typography sx={{ fontSize: 10, color: c.text3 }}>{t.jobCount} {L('open jobs', 'עבודות פתוחות')}</Typography>
            </Box>
          ))}
        </Box>

        {techs.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontSize: 32, mb: 1 }}>🗺️</Typography>
            <Typography sx={{ fontSize: 14, color: c.text3 }}>{L('Add technicians to see their location', 'הוסף טכנאים כדי לראות את מיקומם')}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
