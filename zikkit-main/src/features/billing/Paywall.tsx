'use client';
import { Box, Typography, Button, Stack } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';

/**
 * Trial / Subscription status checker.
 * Reads both snake_case (webhook format) and camelCase (legacy).
 */
function useTrialInfo() {
  const { cfg } = useData();
  const trialEnds = cfg?.trial_ends_at || cfg?.trialEnds;
  const planStatus = cfg?.plan_status || cfg?.planStatus || 'trial';
  const plan = cfg?.plan || 'trial';

  if (!trialEnds) {
    return { isTrialActive: false, isPaywalled: false, daysLeft: 0, plan, planStatus };
  }

  const end = new Date(trialEnds).getTime();
  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));

  // Active = paid plan OR explicit active status
  const isPaid =
    planStatus === 'active' ||
    plan === 'starter' ||
    plan === 'pro' ||
    plan === 'agency' ||
    plan === 'unlimited';

  // Cancelled or expired = paywalled
  const isCancelled = planStatus === 'cancelled' || planStatus === 'expired';
  const isPaywalled = (isCancelled || daysLeft <= 0) && !isPaid;
  const isTrialActive = !isPaid && !isPaywalled && daysLeft > 0;

  return { isTrialActive, isPaywalled, daysLeft, plan, planStatus };
}

/**
 * Paywall — shown when trial expired or subscription cancelled.
 * IMPORTANT: This component never signs the user out.
 * The user stays logged in and can see the upgrade screen.
 */
export function Paywall({ children }: { children: React.ReactNode }) {
  const { isPaywalled, planStatus } = useTrialInfo();
  const { user } = useAuth();

  // Super admins bypass paywall
  if (user?.role === 'super_admin') return <>{children}</>;

  // Active subscription — show app
  if (!isPaywalled) return <>{children}</>;

  // Customize message based on status
  const isCancelled = planStatus === 'cancelled';
  const title = isCancelled ? 'המנוי בוטל' : 'תקופת הניסיון הסתיימה';
  const subtitle = isCancelled
    ? 'המנוי שלך בוטל. חידוש המנוי יחזיר את כל הגישה לחשבון.'
    : 'תקופת הניסיון של 14 ימים הסתיימה. הירשם לתוכנית בתשלום כדי להמשיך להשתמש ב-Zikkit.';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        px: 3,
        py: 6,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: c.accentDim,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          fontSize: 36,
        }}
      >
        🔒
      </Box>

      <Typography sx={{ fontSize: 26, fontWeight: 800, color: c.text, mb: 1.5 }}>
        {title}
      </Typography>

      <Typography
        sx={{
          fontSize: 14,
          color: c.text2,
          maxWidth: 460,
          lineHeight: 1.7,
          mb: 4,
        }}
      >
        {subtitle}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button
          href="/checkout"
          variant="contained"
          sx={{
            fontWeight: 700,
            fontSize: 14,
            px: 4,
            py: 1.5,
            borderRadius: '12px',
            minWidth: 180,
          }}
        >
          {isCancelled ? 'חדש מנוי' : 'שדרג עכשיו'}
        </Button>

        <Button
          href="mailto:support@zikkit.com"
          variant="outlined"
          sx={{
            fontWeight: 600,
            fontSize: 14,
            px: 4,
            py: 1.5,
            borderRadius: '12px',
            minWidth: 180,
          }}
        >
          צור קשר
        </Button>
      </Stack>

      <Typography sx={{ fontSize: 12, color: c.text3, mt: 4 }}>
        הנתונים שלך שמורים בבטחה. תוכל לחזור לשגרה בכל רגע.
      </Typography>
    </Box>
  );
}

/**
 * Trial countdown banner — shown when trial is active.
 */
export function TrialBanner() {
  const { isTrialActive, daysLeft } = useTrialInfo();
  const { user } = useAuth();

  if (!isTrialActive || user?.role === 'super_admin') return null;

  const urgent = daysLeft <= 3;

  return (
    <Box
      sx={{
        px: 2,
        py: '8px',
        textAlign: 'center',
        bgcolor: urgent ? 'rgba(225,29,72,0.06)' : 'rgba(217,119,6,0.06)',
        borderBottom: '1px solid ' + (urgent ? 'rgba(225,29,72,0.12)' : 'rgba(217,119,6,0.12)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 600,
          color: urgent ? c.hot : c.warm,
        }}
      >
        {urgent ? '⚠️ ' : ''}
        {daysLeft} ימים נשארו בתקופת הניסיון
      </Typography>
      <Button
        href="/checkout"
        size="small"
        sx={{
          fontSize: 11,
          fontWeight: 700,
          color: c.accent,
          textDecoration: 'underline',
          textTransform: 'none',
          p: 0,
          minWidth: 'auto',
        }}
      >
        שדרג
      </Button>
    </Box>
  );
}

export { useTrialInfo };
