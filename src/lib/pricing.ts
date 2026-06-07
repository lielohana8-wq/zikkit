/**
 * Zikkit Pricing — single source of truth.
 * Aligned with marketing landing page.
 * UI must read from PRICING_PLANS, never hardcode.
 */

export type PlanId = 'starter' | 'pro' | 'agency';
export type BillingCycle = 'monthly' | 'yearly';

export interface PricingPlan {
  id: PlanId;
  name: { en: string; he: string };
  description: { en: string; he: string };
  monthly: number;
  yearly: number;
  yearlyMonthlyEquivalent: number;
  yearlySavings: number;
  features: { en: string[]; he: string[] };
  limits: {
    technicians: number | 'unlimited';
    jobsPerMonth: number | 'unlimited';
    aiMinutesPerMonth: number;
    businesses: number;
  };
  popular?: boolean;
}

export const PRICING_META = {
  currency: 'ILS' as const,
  currencySymbol: '₪',
  trialDays: 14,
  yearlyDiscountPercent: 20,
  affiliateCommissionPercent: 30,
  region: 'IL' as const,
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: { en: 'Starter', he: 'מתחילים' },
    description: {
      en: 'For independent technicians and small teams',
      he: 'לטכנאים עצמאיים וצוותים קטנים',
    },
    monthly: 239,
    yearly: 2295,
    yearlyMonthlyEquivalent: 191,
    yearlySavings: 573,
    features: {
      en: [
        'AI voice receptionist (Dana)',
        'Up to 2 technicians',
        'Unlimited jobs & customers',
        'Hebrew + English bot',
        'SMS + Email notifications',
        'Mobile app for technicians',
        'Basic reports',
      ],
      he: [
        'בוט קולי AI (דנה)',
        'עד 2 טכנאים',
        'משימות ולקוחות ללא הגבלה',
        'בוט עברית + אנגלית',
        'התראות SMS ואימייל',
        'אפליקציית מובייל לטכנאים',
        'דוחות בסיסיים',
      ],
    },
    limits: { technicians: 2, jobsPerMonth: 'unlimited', aiMinutesPerMonth: 200, businesses: 1 },
  },
  {
    id: 'pro',
    name: { en: 'Pro', he: 'מקצועי' },
    description: {
      en: 'For growing service businesses',
      he: 'לעסקי שירות צומחים',
    },
    monthly: 479,
    yearly: 4599,
    yearlyMonthlyEquivalent: 383,
    yearlySavings: 1149,
    popular: true,
    features: {
      en: [
        'Everything in Starter',
        'Up to 15 technicians',
        'AI auto-assignment',
        'Lead scoring AI',
        'Schedule optimization',
        'WhatsApp daily digest',
        'Advanced analytics',
        'Memberships & recurring',
        'Inventory management',
        'Custom price book',
      ],
      he: [
        'כל מה שב-Starter',
        'עד 15 טכנאים',
        'AI לשיבוץ אוטומטי',
        'AI דירוג לידים',
        'אופטימיזציית לוח זמנים',
        'תקציר יומי בוואטסאפ',
        'אנליטיקה מתקדמת',
        'מנויים ותשלומים חוזרים',
        'ניהול מלאי',
        'מחירון מותאם',
      ],
    },
    limits: { technicians: 15, jobsPerMonth: 'unlimited', aiMinutesPerMonth: 1000, businesses: 1 },
  },
  {
    id: 'agency',
    name: { en: 'Agency', he: 'סוכנות' },
    description: {
      en: 'For agencies managing multiple businesses',
      he: 'לסוכנויות שמנהלות עסקים מרובים',
    },
    monthly: 1439,
    yearly: 13815,
    yearlyMonthlyEquivalent: 1151,
    yearlySavings: 3453,
    features: {
      en: [
        'Everything in Pro',
        'Unlimited technicians',
        'Multi-business dashboard',
        'White-label branding',
        'Priority support',
        'Dedicated account manager',
        'Custom integrations',
        'API access',
        'Affiliate program access',
      ],
      he: [
        'כל מה שב-Pro',
        'טכנאים ללא הגבלה',
        'דאשבורד רב-עסקי',
        'מיתוג לבן (White-label)',
        'תמיכה בעדיפות',
        'מנהל לקוח ייעודי',
        'אינטגרציות מותאמות',
        'גישת API',
        'גישה לתוכנית שותפים',
      ],
    },
    limits: { technicians: 'unlimited', jobsPerMonth: 'unlimited', aiMinutesPerMonth: 5000, businesses: 10 },
  },
];

export const PRICING_BY_ID: Record<PlanId, PricingPlan> = PRICING_PLANS.reduce(
  (acc, plan) => ({ ...acc, [plan.id]: plan }),
  {} as Record<PlanId, PricingPlan>,
);

export function getPlan(id: PlanId): PricingPlan {
  return PRICING_BY_ID[id];
}

export function getPrice(planId: PlanId, cycle: BillingCycle): number {
  const plan = getPlan(planId);
  return cycle === 'monthly' ? plan.monthly : plan.yearly;
}

export function getMonthlyEquivalent(planId: PlanId, cycle: BillingCycle): number {
  const plan = getPlan(planId);
  return cycle === 'monthly' ? plan.monthly : plan.yearlyMonthlyEquivalent;
}

export function formatPrice(amount: number, lang: 'en' | 'he' = 'he'): string {
  if (lang === 'he') {
    return `₪${amount.toLocaleString('he-IL')}`;
  }
  return `₪${amount.toLocaleString('en-US')}`;
}

export function formatPricePerMonth(planId: PlanId, cycle: BillingCycle, lang: 'en' | 'he' = 'he'): string {
  const monthly = getMonthlyEquivalent(planId, cycle);
  const formatted = formatPrice(monthly, lang);
  return lang === 'he' ? `${formatted}/חודש` : `${formatted}/mo`;
}

export function getTrialDays(): number {
  return PRICING_META.trialDays;
}

export function getPlanName(planId: PlanId, lang: 'en' | 'he' = 'he'): string {
  return getPlan(planId).name[lang];
}

export function getPlanDescription(planId: PlanId, lang: 'en' | 'he' = 'he'): string {
  return getPlan(planId).description[lang];
}

export function getPlanFeatures(planId: PlanId, lang: 'en' | 'he' = 'he'): string[] {
  return getPlan(planId).features[lang];
}
