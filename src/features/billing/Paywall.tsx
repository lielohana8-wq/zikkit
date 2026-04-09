'use client';
import { Box, Typography, Button } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';

function useTrialInfo() {
  const { cfg } = useData();
  // Support both snake_case (webhook) and camelCase (legacy)
  const trialEnds = cfg.trial_ends_at || cfg.trialEnds;
  const planStatus = cfg.plan_status || cfg.planStatus || 'trial';
  const plan = cfg.plan || 'trial';

  if (!trialEnds) return { isTrialActive: false, isPaywalled: false, daysLeft: 0, plan, planStatus };
  const end = new Date(trialEnds).getTime();
  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
  const isPaid = planStatus === 'active' || plan === 'starter' || plan === 'unlimited';
  const isTrialActive = !isPaid && daysLeft > 0;
  const isPaywalled = !isPaid && daysLeft <= 0;
  return { isTrialActive, isPaywalled, daysLeft, plan, planStatus };
}

export function Paywall({ children }: { children: React.ReactNode }) {
  const { isPaywalled } = useTrialInfo();
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <>{children}</>;
  if (!isPaywalled) return <>{children}</>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', px: 3 }}>
      <Box sx={{ fontSize: 56, mb: 2 }}>🔒</Box>
      <Typography sx={{ fontSize: 24, fontWeight: 800, color: c.text, mb: 1 }}>תקופת הניסיון הסתיימה</Typography>
      <Typography sx={{ fontSize: 14, color: c.text2, maxWidth: 440, lineHeight: 1.7, mb: 3 }}>
        תקופת הניסיון של 14 יום הסתיימה. הירשם לתוכנית בתשלום כדי להמשיך להשתמש ב-Zikkit.
      </Typography>
      <Button href="/checkout" variant="contained" sx={{ fontWeight: 700, fontSize: 14, px: 4, py: 1.5, borderRadius: '10px' }}>
        שדרג עכשיו
      </Button>
    </Box>
  );
}

export function TrialBanner() {
  const { isTrialActive, daysLeft } = useTrialInfo();
  const { user } = useAuth();
  if (!isTrialActive || user?.role === 'super_admin') return null;

  const urgent = daysLeft <= 3;
  return (
    <Box sx={{
      px: 2, py: '8px', textAlign: 'center',
      bgcolor: urgent ? 'rgba(225,29,72,0.06)' : 'rgba(217,119,6,0.06)',
      borderBottom: '1px solid ' + (urgent ? 'rgba(225,29,72,0.12)' : 'rgba(217,119,6,0.12)'),
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
    }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: urgent ? c.hot : c.warm }}>
        {urgent ? '⚠️ ' : ''}{daysLeft} ימים נשארו בתקופת הניסיון
      </Typography>
      <Button href="/checkout" size="small" sx={{ fontSize: 11, fontWeight: 700, color: c.accent, textDecoration: 'underline', textTransform: 'none', p: 0, minWidth: 'auto' }}>
        שדרג
      </Button>
    </Box>
  );
}

export { useTrialInfo };
