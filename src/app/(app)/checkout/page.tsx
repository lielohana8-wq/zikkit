'use client';
import { Box, Typography, Button } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { openCheckout } from '@/lib/paddle';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { useL } from '@/hooks/useL';

export default function CheckoutPage() {
  const { bizId } = useAuth();
  const { cfg } = useData();
  const L = useL();
  const isIL = cfg.region === 'IL' || cfg.lang === 'he';

  const plans = isIL ? [
    { id: 'pri_starter', name: 'Business', price: '₪499', period: '/חודש', annual: '₪4,490/שנה', desc: 'עד 10 טכנאים', popular: false,
      features: ['בוט AI קולי 24/7','ניהול עבודות','הצעות מחיר','CRM ולידים','SMS אוטומטי','פורטל לקוחות','מעקב GPS','דוחות ושכר'] },
    { id: 'pri_unlimited', name: 'Unlimited', price: '₪799', period: '/חודש', annual: '₪7,490/שנה', desc: 'הכל ללא הגבלה', popular: true,
      features: ['הכל ב-Business','טכנאים ללא הגבלה','שיחות AI ללא הגבלה','דוחות מתקדמים','תמיכה עדיפה','מיתוג מותאם','ריבוי סניפים'] },
  ] : [
    { id: 'pri_starter', name: 'Business', price: '$699', period: '/mo', annual: '$6,290/yr', desc: 'Up to 10 techs', popular: false,
      features: ['AI Voice Bot 24/7','Job management','Quotes & invoices','CRM & Leads','SMS automation','Client portal','GPS tracking','Reports & Payroll'] },
    { id: 'pri_unlimited', name: 'Unlimited', price: '$1,099', period: '/mo', annual: '$9,990/yr', desc: 'Unlimited everything', popular: true,
      features: ['Everything in Business','Unlimited technicians','Unlimited AI calls','Advanced reports','Priority support','Custom branding','Multi-location'] },
  ];

  const handleSubscribe = (priceId: string) => {
    openCheckout(priceId, { bizId: bizId || '' });
  };

  return (
    <Box className="zk-fade-up" sx={{ p: { xs: '20px', md: '32px' }, maxWidth: 820, mx: 'auto' }}>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: c.text, textAlign: 'center', mb: '4px' }}>
        {isIL ? 'בחר תוכנית' : 'Choose Your Plan'}
      </Typography>
      <Typography sx={{ fontSize: 13, color: c.text3, textAlign: 'center', mb: 4 }}>
        {isIL ? 'שדרג כדי להמשיך להשתמש ב-Zikkit' : 'Subscribe to keep using Zikkit'}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '16px' }}>
        {plans.map((p) => (
          <Box key={p.id} sx={{
            p: '28px', borderRadius: '14px',
            bgcolor: '#fff',
            border: p.popular ? ('2px solid ' + c.accent) : ('1px solid ' + c.border),
            position: 'relative',
            transition: 'all 0.2s',
            '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.06)', transform: 'translateY(-2px)' },
          }}>
            {p.popular && (
              <Box sx={{ position: 'absolute', top: -12, right: 20, px: '12px', py: '3px', borderRadius: '6px', bgcolor: c.accent, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                {isIL ? 'מומלץ' : 'Recommended'}
              </Box>
            )}

            <Typography sx={{ fontSize: 14, fontWeight: 600, color: c.accent, mb: '4px' }}>{p.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '4px', mb: '2px' }}>
              <Typography sx={{ fontSize: 38, fontWeight: 800, color: c.text, lineHeight: 1 }}>{p.price}</Typography>
              <Typography sx={{ fontSize: 13, color: c.text3 }}>{p.period}</Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: c.text3, mb: '2px' }}>{p.desc}</Typography>
            <Typography sx={{ fontSize: 11, color: c.warm, fontWeight: 600, mb: '16px' }}>
              {isIL ? 'או ' : 'or '}{p.annual} ({isIL ? 'חסכון ~25%' : 'save ~25%'})
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', mb: '20px' }}>
              {p.features.map((f) => (
                <Box key={f} sx={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: 13, color: c.text2 }}>
                  <Box sx={{ color: c.green, fontSize: 14, lineHeight: 1 }}>✓</Box>
                  {f}
                </Box>
              ))}
            </Box>

            <Button
              fullWidth variant={p.popular ? 'contained' : 'outlined'}
              onClick={() => handleSubscribe(p.id)}
              sx={{ fontWeight: 700, fontSize: 14, py: 1.2, borderRadius: '10px' }}
            >
              {isIL ? 'הירשם' : 'Subscribe'}
            </Button>
          </Box>
        ))}
      </Box>

      <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 11, color: c.text3 }}>
        {isIL ? 'ניתן לבטל בכל עת. תשלום מאובטח דרך Paddle.' : 'Cancel anytime. Secure payment via Paddle.'}
      </Typography>
    </Box>
  );
}
