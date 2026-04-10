'use client';
import { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { DataProvider, useData } from '@/hooks/useFirestore';
import { BillingProvider } from '@/features/billing/PaddleProvider';
import { NotificationProvider } from '@/features/notifications/NotificationProvider';
import { Paywall, TrialBanner } from '@/features/billing/Paywall';
import { MobileNav } from '@/components/layout/MobileNav';
import { GpsTracker } from '@/components/ui/GpsTracker';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import dynamic from 'next/dynamic';
const SetupWizard = dynamic(() => import('@/components/onboarding/SetupWizard'), { ssr: false });

function AppContent({ children }: { children: React.ReactNode }) {
  const { cfg, saveCfg, db } = useData();
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();
  const [showWizard, setShowWizard] = useState(false);
  const checkedRef = useRef(false);

  // Sync language from saved cfg
  useEffect(() => {
    if (cfg?.lang && cfg.lang !== lang && ['en', 'es', 'he'].includes(cfg.lang)) {
      setLang(cfg.lang as 'en' | 'es' | 'he');
    } else if (!cfg?.lang && (cfg?.region === 'IL' || lang === 'en') && lang !== 'he') {
      setLang('he');
    }
  }, [cfg?.lang, cfg?.region]);

  // Setup wizard — show ONLY for brand new empty accounts
  useEffect(() => {
    if (checkedRef.current) return;
    if (!cfg || Object.keys(cfg).length === 0) return;
    checkedRef.current = true;

    // Already completed? Never show.
    if (cfg.setup_done === true) return;
    if (sessionStorage.getItem('zk_wizard_done')) return;

    // Has real business data? Not new.
    if ((db.jobs || []).length > 0) return;

    // Truly new account — show wizard
    setShowWizard(true);
  }, [cfg, db]);

  const handleWizardComplete = async () => {
    await saveCfg({ ...cfg, setup_done: true });
    sessionStorage.setItem('zk_wizard_done', '1');
    setShowWizard(false);
  };

  if (showWizard) {
    return <SetupWizard onComplete={handleWizardComplete} />;
  }

  return (
    <>
      <TrialBanner />
      <AppShell>
        <Paywall>
          <Box sx={{ pb: { xs: '80px', md: 0 }, px: pathname?.includes('/schedule') ? 0 : '30px', py: pathname?.includes('/schedule') ? 0 : '30px' }}>{children}</Box>
        </Paywall>
      </AppShell>
      <MobileNav />
          <GpsTracker />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DataProvider>
        <BillingProvider>
          <NotificationProvider>
            <AppContent>{children}</AppContent>
          </NotificationProvider>
        </BillingProvider>
      </DataProvider>
    </AuthGuard>
  );
}
