/**
 * Region / edition configuration.
 *
 * One codebase, several deployments. The region is fixed per deployment via
 * NEXT_PUBLIC_ZIKKIT_REGION (IL | US | CA). Everything locale-dependent
 * (language, direction, currency, tax defaults, phone prefix, timezone)
 * derives from here instead of being sprinkled across the app.
 *
 * CA runs the English "Solo" edition: a focused workspace with
 * Customers / Quotes / Receipts / Closings, on top of the shared data layer.
 */
export type Region = 'IL' | 'US' | 'CA';
export type Lang = 'en' | 'es' | 'he';

export interface RegionDefaults {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  locale: string;          // Intl locale for dates/numbers
  currency: string;        // ISO 4217
  taxRate: number;         // percent
  taxLabel: string;        // printed on documents
  taxNumberLabel: string;  // e.g. "GST/HST #"
  timezone: string;
  phonePrefix: string;
  phoneDigits: number;     // national significant digits
  postalLabel: string;
  provinceLabel: string;
  dateFormat: Intl.DateTimeFormatOptions;
}

const DEFAULTS: Record<Region, RegionDefaults> = {
  CA: {
    lang: 'en', dir: 'ltr', locale: 'en-CA', currency: 'CAD',
    taxRate: 13, taxLabel: 'HST', taxNumberLabel: 'GST/HST #',
    timezone: 'America/Toronto', phonePrefix: '+1', phoneDigits: 10,
    postalLabel: 'Postal code', provinceLabel: 'Province',
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
  },
  US: {
    lang: 'en', dir: 'ltr', locale: 'en-US', currency: 'USD',
    taxRate: 0, taxLabel: 'Tax', taxNumberLabel: 'Tax ID',
    timezone: 'America/New_York', phonePrefix: '+1', phoneDigits: 10,
    postalLabel: 'ZIP', provinceLabel: 'State',
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
  },
  IL: {
    lang: 'he', dir: 'rtl', locale: 'he-IL', currency: 'ILS',
    taxRate: 18, taxLabel: 'מע"מ', taxNumberLabel: 'עוסק מורשה',
    timezone: 'Asia/Jerusalem', phonePrefix: '+972', phoneDigits: 9,
    postalLabel: 'מיקוד', provinceLabel: 'עיר',
    dateFormat: { year: 'numeric', month: '2-digit', day: '2-digit' },
  },
};

function readRegion(): Region {
  const raw = (process.env.NEXT_PUBLIC_ZIKKIT_REGION || 'IL').toUpperCase();
  return (raw === 'CA' || raw === 'US' || raw === 'IL') ? raw : 'IL';
}

export const REGION: Region = readRegion();
export const REGION_DEFAULTS: RegionDefaults = DEFAULTS[REGION];
export const ALL_REGION_DEFAULTS = DEFAULTS;

/** The English Solo edition (Customers / Quotes / Receipts / Closings). */
export const IS_SOLO_EDITION: boolean = REGION === 'CA' || process.env.NEXT_PUBLIC_ZIKKIT_EDITION === 'solo';

/** Public base URL used in links we send to customers. */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
}

/** Normalize a phone number to E.164 using the region prefix when the user typed a national number. */
export function normalizePhone(input: string, prefix: string = REGION_DEFAULTS.phonePrefix): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '');
  let digits = trimmed.replace(/\D/g, '');
  if (prefix === '+1') {
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    return digits.length === 10 ? '+1' + digits : (digits ? '+' + digits : '');
  }
  if (prefix === '+972') {
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '+972' + digits;
  }
  return prefix + digits;
}

export function formatMoney(amount: number, currency: string = REGION_DEFAULTS.currency, locale: string = REGION_DEFAULTS.locale): string {
  if (amount == null || isNaN(amount)) amount = 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDateLocal(iso: string | undefined, locale: string = REGION_DEFAULTS.locale): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, REGION_DEFAULTS.dateFormat);
}
