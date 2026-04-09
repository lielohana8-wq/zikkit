'use client';
import { Box, Typography, Button } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { openCheckout } from '@/lib/paddle';
import { useAuth } from '@/features/auth/AuthProvider';
import { useGeoDetection } from '@/hooks/useGeoDetection';

const plansUS = [
  { id: 'pri_starter', name: 'Business', price: '$699', period: '/mo', annual: '$6,290/yr', desc: 'Up to 10 techs', features: ['AI Voice Bot 24/7','Job management','Quotes & invoices','CRM & Leads','SMS automation','Client portal','GPS tracking','Reports & Payroll'] },
  { id: 'pri_unlimited', name: 'Unlimited', price: '$1,099', period: '/mo', annual: '$9,990/yr', desc: 'Unlimited everything', popular: true, features: ['Everything in Business','Unlimited technicians','Unlimited AI calls','Advanced reports','Priority support','Custom branding','Multi-location'] },
];

const plansIL = [
  { id: 'pri_starter', name: 'Business', price: '₪499', period: '/חודש', annual: '₪4,490/שנה', desc: 'עד 10 טכנאים', features: ['בוט AI קולי 24/7','ניהול עבודות','הצעות מחיר','CRM ולידים','SMS אוטומטי','פורטל לקוחות','מעקב GPS','דוחות ושכר'] },
  { id: 'pri_unlimited', name: 'Unlimited', price: '₪799', period: '/חודש', annual: '₪7,490/שנה', desc: 'הכל ללא הגבלה', popular: true, features: ['הכל ב-Business','טכנאים ללא הגבלה','שיחות AI ללא הגבלה','דוחות מתקדמים','תמיכה עדיפה','מיתוג מותאם','ריבוי סניפים'] },
];

export default function CheckoutPage() {
  const { bizId } = useAuth();
  const { isIL } = useGeoDetection();
  const plans = isIL ? plansIL : plansUS;

  return (
    <Box sx={{ p: { xs: '16px', md: '24px 28px' }, maxWidth: 800, mx: 'auto' }}>
      <Typography sx={{ fontSize: 24, fontWeight: 900, fontFamily: 'Syne', textAlign: 'center', mb: 1 }}>
        {isIL ? 'בחר תוכנית' : 'Choose Your Plan'}
      </Typography>
      <Typography sx={{ fontSize: 13, color: c.text3, textAlign: 'center', mb: 4 }}>
        {isIL ? 'שדרג כדי להמשיך להשתמש בבוט AI.' : 'Subscribe to keep your AI bot active.'}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {plans.map((p) => (
          <Box key={p.id} sx={{ p: 3.5, borderRadius: '16px', bgcolor: p.popular ? 'rgba(0,229,176,0.04)' : c.glass, border: p.popular ? '2px solid rgba(0,229,176,0.15)' : '1px solid '+c.border, position: 'relative' }}>
            {p.popular && <Box sx={{ position: 'absolute', top: -12, right: 20, px: 2, py: 0.4, borderRadius: '8px', bgcolor: c.accent, color: '#000', fontSize: 11, fontWeight: 700 }}>{isIL ? 'מומלץ' : 'Recommended'}</Box>}
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.accent }}>{p.name}</Typography>
            <Typography sx={{ fontSize: 36, fontWeight: 900, fontFamily: 'Syne', mt: 0.5 }}>{p.price}<Box component='span' sx={{ fontSize: 14, color: c.text3 }}>{p.period}</Box></Typography>
            <Typography sx={{ fontSize: 12, color: c.text3, mb: 0.5 }}>{p.desc}</Typography>
            <Typography sx={{ fontSize: 11, color: c.warm, mb: 2 }}>{isIL ? 'או ' : 'or '}{p.annual}</Typography>
            {p.features.map((f) => <Box key={f} sx={{ display: 'flex', gap: 1, py: 0.4, fontSize: 13, color: c.text2 }}><span style={{ color: c.green }}>✓</span>{f}</Box>)}
            <Button fullWidth onClick={() => openCheckout(p.id, { bizId: bizId || '' })} sx={{ mt: 2.5, bgcolor: p.popular ? c.accent : c.glass2, color: p.popular ? '#000' : c.text2, fontWeight: 800, fontSize: 14, py: 1.3, borderRadius: '10px', textTransform: 'none' }}>
              {isIL ? 'הירשם' : 'Subscribe'}
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
