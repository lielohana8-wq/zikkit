export const ALLOWED_DOMAINS = [
  'zikkit-5e554.web.app',
  'zikkit-5e554.firebaseapp.com',
  'zikkit.netlify.app',
  'zikkitai.netlify.app',
  'localhost',
  '127.0.0.1',
] as const;

export const STORAGE_KEYS = {
  DATA: 'fp_data',
  CONFIG: 'fp_config',
  LOGIN_ATTEMPTS: '_zk_att',
  LOCKOUT_UNTIL: '_zk_lock',
} as const;

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const IDLE_WARNING_MS = 25 * 60 * 1000; // 25 minutes — 5 min warning
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const PADDLE_TOKEN = process.env.NEXT_PUBLIC_PADDLE_TOKEN || 'live_0190a488b7b94e07d30b4272e61';

export const BUSINESS_TYPES = [
  { key: 'hvac', icon: '❄️', label: 'HVAC', desc: 'Heating, Ventilation, AC' },
  { key: 'plumbing', icon: '🔧', label: 'Plumbing', desc: 'Pipes, fixtures, drainage' },
  { key: 'electrical', icon: '⚡', label: 'Electrical', desc: 'Wiring, panels, outlets' },
  { key: 'garage', icon: '🏠', label: 'Garage Doors', desc: 'Install, repair, maintenance' },
  { key: 'chimney', icon: '🔥', label: 'Chimney', desc: 'Sweep, repair, install' },
  { key: 'general', icon: '🛠️', label: 'General', desc: 'Handyman, multi-trade' },
] as const;

export const JOB_STATUS_CONFIG = {
  open: { label: 'Open', he: 'פתוח', color: 'blue', badge: 'b-open' },
  assigned: { label: 'Assigned', he: 'שויך', color: 'purple', badge: 'b-purple' },
  in_progress: { label: 'In Progress', he: 'בטיפול', color: 'warm', badge: 'b-warm' },
  waiting_parts: { label: 'Waiting Parts', he: 'ממתין לחלקים', color: 'warm', badge: 'b-warm' },
  parts_arrived: { label: 'Parts Arrived', he: 'חלקים הגיעו', color: 'accent', badge: 'b-new' },
  scheduled: { label: 'Scheduled', he: 'מתוכנן', color: 'blue', badge: 'b-open' },
  completed: { label: 'Completed', he: 'הושלם', color: 'green', badge: 'b-done' },
  cancelled: { label: 'Cancelled', he: 'בוטל', color: 'grey', badge: 'b-grey' },
  no_answer: { label: 'No Answer', he: 'אין מענה', color: 'hot', badge: 'b-hot' },
  callback: { label: 'Callback', he: 'חזרה', color: 'warm', badge: 'b-warm' },
  dispute: { label: 'Dispute', he: 'מחלוקת', color: 'hot', badge: 'b-hot' },
} as const;

export const LEAD_STATUS_CONFIG = {
  new: { label: 'New', he: 'חדש', color: 'accent', badge: 'b-new' },
  hot: { label: 'Hot', he: 'חם', color: 'hot', badge: 'b-hot' },
  warm: { label: 'Warm', he: 'חמים', color: 'warm', badge: 'b-warm' },
  cold: { label: 'Cold', he: 'קר', color: 'grey', badge: 'b-grey' },
  contacted: { label: 'Contacted', he: 'נוצר קשר', color: 'blue', badge: 'b-open' },
  converted: { label: 'Converted', he: 'הומר', color: 'green', badge: 'b-done' },
  lost: { label: 'Lost', he: 'אבוד', color: 'grey', badge: 'b-grey' },
} as const;

export const PLANS = {
  us: {
    starter: {
      price: '$699', symbol: '$', period: '/mo',
      annualPrice: '$6,290', annualNote: 'Annual — save $2,100 (3 months free)',
      monthlySave: '$524/mo', name: 'Starter',
      techs: 'Up to 3 technicians', calls: '500 AI calls/month',
    },
    pro: {
      price: '$1,099', symbol: '$', period: '/mo',
      annualPrice: '$9,890', annualNote: 'Annual — save $3,300 (3 months free)',
      monthlySave: '$824/mo', name: 'Unlimited',
      techs: 'Unlimited technicians', calls: 'Unlimited AI calls',
    },
    currency: 'USD', symbol: '$',
  },
  il: {
    starter: {
      price: '₪499', symbol: '₪', period: '/חודש',
      annualPrice: '₪4,490', annualNote: 'שנתי — 3 חודשים חינם | חיסכון ₪1,500',
      monthlySave: '₪374/חודש', name: 'Starter',
      techs: 'עד 3 טכנאים', calls: '300 שיחות AI לחודש',
    },
    pro: {
      price: '₪749', symbol: '₪', period: '/חודש',
      annualPrice: '₪6,990', annualNote: 'שנתי — 3 חודשים חינם | חיסכון ₪2,000',
      monthlySave: '₪582/חודש', name: 'Pro',
      techs: 'טכנאים ללא הגבלה', calls: 'שיחות AI ללא הגבלה',
    },
    currency: 'ILS', symbol: '₪',
  },
} as const;

// Helper to get status label in correct language
export function jobStatusLabel(status: string, lang: string = 'en'): string {
  const cfg = JOB_STATUS_CONFIG[status as keyof typeof JOB_STATUS_CONFIG];
  if (!cfg) return status;
  return lang === 'he' ? cfg.he : cfg.label;
}

export function leadStatusLabel(status: string, lang: string = 'en'): string {
  const cfg = LEAD_STATUS_CONFIG[status as keyof typeof LEAD_STATUS_CONFIG];
  if (!cfg) return status;
  return lang === 'he' ? cfg.he : cfg.label;
}
