'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';
import { BillingProvider } from '@/features/billing/PaddleProvider';
import { NotificationProvider } from '@/features/notifications/NotificationProvider';
import { Paywall, TrialBanner } from '@/features/billing/Paywall';
import { MobileNav } from '@/components/layout/MobileNav';
import { GpsTracker } from '@/components/ui/GpsTracker';
import { PWAInstall } from '@/components/ui/PWAInstall';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { IS_SOLO_EDITION } from '@/lib/region';
import { ROLE_ROUTES, roleHome, soloRoleOf } from '@/features/solo/roles';
import dynamic from 'next/dynamic';
const SetupWizard = dynamic(() => import('@/components/onboarding/SetupWizard'), { ssr: false });

/**
 * App layout.
 *
 * Fix: this layout used to mount a SECOND DataProvider on top of the one in
 * DataBridge (root layout). Two providers = two states, two sync loops and a
 * bizId that only reached one of them. There is now exactly one provider —
 * the one in DataBridge — and this layout only consumes it.
 */
function AppContent({ children }: { children: React.ReactNode }) {
  const { cfg, saveCfg, db, ready, bizId } = useData();
  const { user, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const checkedRef = useRef(false);

  // Sync language from saved cfg (solo edition is English-only)
  useEffect(() => {
    if (IS_SOLO_EDITION) { if (lang !== 'en') setLang('en'); return; }
    if (cfg?.lang && cfg.lang !== lang && ['en', 'es', 'he'].includes(cfg.lang)) {
      setLang(cfg.lang as 'en' | 'es' | 'he');
    } else if (!cfg?.lang && (cfg?.region === 'IL' || lang === 'en') && lang !== 'he') {
      setLang('he');
    }
  }, [cfg?.lang, cfg?.region]); // eslint-disable-line react-hooks/exhaustive-deps

  // First-run setup — only once the data has actually loaded (the old code raced the sync and showed the wizard to existing accounts)
  useEffect(() => {
    if (checkedRef.current || !ready) return;
    if (!cfg || Object.keys(cfg).length === 0) return;
    checkedRef.current = true;
    if (IS_SOLO_EDITION) {
      if (soloRoleOf(user) === 'owner' && !cfg.solo_setup_done && !cfg.setup_done && pathname !== '/settings') router.replace('/settings?setup=1');
      return;
    }
    if (cfg.setup_done === true) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem('zk_wizard_done')) return;
    if ((db.jobs || []).length > 0) return;
    setShowWizard(true);
  }, [cfg, db, ready, pathname, router, user]);

  const handleWizardComplete = async () => {
    await saveCfg({ setup_done: true });
    sessionStorage.setItem('zk_wizard_done', '1');
    setShowWizard(false);
  };

  const soloRole = IS_SOLO_EDITION ? soloRoleOf(user) : null;
  useEffect(() => {
    if (!IS_SOLO_EDITION || !soloRole || !pathname) return;
    const base = '/' + pathname.split('/')[1];
    if (!ROLE_ROUTES[soloRole].includes(base)) router.replace(roleHome(soloRole));
  }, [soloRole, pathname, router]);

  if (IS_SOLO_EDITION && user && !soloRole) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 40 }}>🔒</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 18 }}>This account isn't linked to a business</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 380 }}>If you were invited, open the invite link you received and sign in with the invited email ({user.email}). Otherwise ask the business owner for a new invite.</Typography>
        <Button onClick={logout} sx={{ mt: 1 }}>Sign out</Button>
      </Box>
    );
  }

  if (bizId && !ready && String(user?.role) !== 'pending') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress size={28} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{IS_SOLO_EDITION ? 'Loading your workspace…' : 'טוען…'}</Typography>
      </Box>
    );
  }

  if (showWizard && !IS_SOLO_EDITION) {
    return <SetupWizard onComplete={handleWizardComplete} />;
  }

  const content = (
    <Box sx={{ pb: { xs: '80px', md: 0 }, px: pathname?.includes('/schedule') ? 0 : { xs: '14px', md: '30px' }, py: pathname?.includes('/schedule') ? 0 : { xs: '14px', md: '30px' } }}>{children}</Box>
  );

  return (
    <>
      {!IS_SOLO_EDITION && <TrialBanner />}
      <AppShell>
        {IS_SOLO_EDITION ? content : <Paywall>{content}</Paywall>}
      </AppShell>
      <MobileNav />
      <GpsTracker />
      <PWAInstall />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BillingProvider>
        <NotificationProvider>
          <AppContent>{children}</AppContent>
        </NotificationProvider>
      </BillingProvider>
    </AuthGuard>
  );
}
