export interface PaddleSubscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled';
  planId: string;
  planName: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface BillingState {
  subscription: PaddleSubscription | null;
  loading: boolean;
  trialDaysLeft: number;
  isTrialExpired: boolean;
  isPaid: boolean;
  isRestricted: boolean;
}
