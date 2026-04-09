'use client';
import { useEffect, createContext, useContext, useState, type ReactNode } from 'react';
import { initPaddle } from '@/lib/paddle';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';

interface BillingState {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  isPaywalled: boolean;
  daysLeft: number;
}

const BillingContext = createContext<BillingState>({
  plan: 'trial', status: 'trial', trialEndsAt: null,
  isTrialActive: true, isPaywalled: false, daysLeft: 30,
});

export function BillingProvider({ children }: { children: ReactNode }) {
  const { bizId } = useAuth();
  const { cfg } = useData();
  const [ready, setReady] = useState(false);

  useEffect(() => { initPaddle().then(() => setReady(true)); }, []);

  const trialEndsAt = cfg.trial_ends_at || null;
  const plan = cfg.plan || 'trial';
  const status = cfg.plan_status || 'trial';
  
  const now = Date.now();
  const trialEnd = trialEndsAt ? new Date(trialEndsAt).getTime() : now + 30 * 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000)));
  const isTrialActive = status === 'trial' && daysLeft > 0;
  const isPaywalled = status === 'trial' && daysLeft <= 0;

  return (
    <BillingContext.Provider value={{ plan, status, trialEndsAt, isTrialActive, isPaywalled, daysLeft }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() { return useContext(BillingContext); }
