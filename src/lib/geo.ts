import type { BusinessRegion } from '@/types/config';

// ─── Field Labels ───
export function getGeoLabels(region: BusinessRegion) {
  return region === 'IL' ? {
    zip: 'מיקוד',
    address: 'כתובת',
    city: 'עיר',
    state: '',
    phone: 'טלפון',
    addressPlaceholder: 'רחוב, מספר',
    cityPlaceholder: 'תל אביב',
    zipPlaceholder: '6100000',
    phonePlaceholder: '050-000-0000',
    currency: '₪',
    currencyCode: 'ILS',
    dateFormat: 'DD/MM/YYYY',
    serviceArea: 'אזור שירות',
    serviceAreaPlaceholder: 'תל אביב, רמת גן, גבעתיים',
    businessHours: 'שעות פעילות',
    businessHoursPlaceholder: "א'-ה' 08:00-18:00",
  } : {
    zip: 'ZIP Code',
    address: 'Address',
    city: 'City',
    state: 'State',
    phone: 'Phone',
    addressPlaceholder: '123 Main St',
    cityPlaceholder: 'New York',
    zipPlaceholder: '10001',
    phonePlaceholder: '(555) 000-0000',
    currency: '$',
    currencyCode: 'USD',
    dateFormat: 'MM/DD/YYYY',
    serviceArea: 'Service Area',
    serviceAreaPlaceholder: '10001, 10002, 10003 or Manhattan, Brooklyn',
    businessHours: 'Business Hours',
    businessHoursPlaceholder: 'Mon-Fri 8am-6pm',
  };
}

// ─── Phone formatting ───
export function formatPhoneByRegion(phone: string, region: BusinessRegion): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');

  if (region === 'IL') {
    // Israeli format: 050-123-4567
    if (digits.length === 10 && digits.startsWith('0')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 12 && digits.startsWith('972')) {
      return `0${digits.slice(3, 5)}-${digits.slice(5, 8)}-${digits.slice(8)}`;
    }
    return phone;
  }

  // US format: (555) 123-4567
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// ─── Date formatting ───
export function formatDateByRegion(dateStr: string | undefined, region: BusinessRegion): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  if (region === 'IL') {
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Currency formatting ───
export function formatCurrencyByRegion(amount: number, region: BusinessRegion): string {
  const currency = region === 'IL' ? 'ILS' : 'USD';
  const locale = region === 'IL' ? 'he-IL' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Twilio phone format ───
export function toE164(phone: string, region: BusinessRegion): string {
  const digits = phone.replace(/\D/g, '');
  if (region === 'IL') {
    if (digits.startsWith('972')) return '+' + digits;
    if (digits.startsWith('0')) return '+972' + digits.slice(1);
    return '+972' + digits;
  }
  if (digits.startsWith('1') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}
