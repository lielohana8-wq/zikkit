'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useParams } from 'next/navigation';

interface LandingData {
  businessName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  about: string;
  whyUs: Array<{ icon: string; title: string; desc: string }>;
  servicesIntro: string;
  services: Array<{ name: string; price?: string; duration?: number }>;
  testimonialPlaceholder: string;
  ctaSection: string;
  colorTheme: string;
  contactPhone: string;
  gallery?: string[];
}

export default function PublicSite() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/site/${slug}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }
  if (!data) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ fontSize: 48 }}>🔍</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700 }}>הדף לא נמצא</Typography>
    </Box>;
  }

  const accent = data.colorTheme || '#4F46E5';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FCFBF9', direction: 'rtl' }}>
      {/* Hero */}
      <Box sx={{ background: `linear-gradient(160deg, ${accent}15, #FCFBF9)`, py: { xs: 8, md: 12 }, px: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: accent, letterSpacing: 1, mb: 2 }}>{data.tagline}</Typography>
        <Typography sx={{ fontSize: { xs: 36, md: 56 }, fontWeight: 900, color: '#1C1917', lineHeight: 1.1, mb: 2, maxWidth: 800, mx: 'auto' }}>{data.heroTitle}</Typography>
        <Typography sx={{ fontSize: { xs: 16, md: 20 }, color: '#57534E', mb: 4, maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>{data.heroSubtitle}</Typography>
        {data.contactPhone && (
          <Button href={`tel:${data.contactPhone}`} variant="contained" size="large"
            sx={{ py: 2, px: 5, fontSize: 17, fontWeight: 800, borderRadius: 99, bgcolor: accent, '&:hover': { bgcolor: accent, filter: 'brightness(0.9)' } }}>
            {data.ctaText} · {data.contactPhone}
          </Button>
        )}
      </Box>

      {/* About */}
      <Box sx={{ maxWidth: 760, mx: 'auto', py: 6, px: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 18, color: '#3F3A36', lineHeight: 1.8 }}>{data.about}</Typography>
      </Box>

      {/* Why us */}
      {data.whyUs?.length > 0 && (
        <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4, px: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
            {data.whyUs.map((w, i) => (
              <Box key={i} sx={{ bgcolor: '#fff', borderRadius: 4, p: 4, textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                <Box sx={{ fontSize: 40, mb: 2 }}>{w.icon}</Box>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1C1917', mb: 1 }}>{w.title}</Typography>
                <Typography sx={{ fontSize: 14, color: '#57534E', lineHeight: 1.6 }}>{w.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Services */}
      {data.services?.length > 0 && (
        <Box sx={{ maxWidth: 760, mx: 'auto', py: 6, px: 3 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 800, textAlign: 'center', mb: 1, color: '#1C1917' }}>השירותים שלנו</Typography>
          <Typography sx={{ fontSize: 15, color: '#57534E', textAlign: 'center', mb: 4 }}>{data.servicesIntro}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {data.services.map((s, i) => (
              <Box key={i} sx={{ bgcolor: '#fff', borderRadius: 3, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1C1917' }}>{s.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {s.duration && <Typography sx={{ fontSize: 13, color: '#A8A29E' }}>{s.duration} דק'</Typography>}
                  {s.price && <Typography sx={{ fontSize: 18, fontWeight: 800, color: accent }}>₪{s.price}</Typography>}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Gallery */}
      {data.gallery && data.gallery.length > 0 && (
        <Box sx={{ maxWidth: 1000, mx: 'auto', py: 6, px: 3 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 800, textAlign: 'center', mb: 4, color: '#1C1917' }}>העבודות שלנו</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {data.gallery.map((url, i) => (
              <Box key={i} component="img" src={url} sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3 }} />
            ))}
          </Box>
        </Box>
      )}

      {/* CTA */}
      <Box sx={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, py: 8, px: 3, textAlign: 'center', mt: 4 }}>
        <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 800, color: '#fff', mb: 3, maxWidth: 600, mx: 'auto' }}>{data.ctaSection}</Typography>
        {data.contactPhone && (
          <Button href={`tel:${data.contactPhone}`} variant="contained" size="large"
            sx={{ py: 2, px: 5, fontSize: 17, fontWeight: 800, borderRadius: 99, bgcolor: '#fff', color: accent, '&:hover': { bgcolor: '#fff' } }}>
            📞 {data.contactPhone}
          </Button>
        )}
      </Box>

      <Typography sx={{ textAlign: 'center', py: 3, fontSize: 12, color: '#A8A29E' }}>
        מופעל ע"י Zikkit
      </Typography>
    </Box>
  );
}
