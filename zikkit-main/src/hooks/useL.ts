'use client';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Simple bilingual label function.
 * Usage: const L = useL();
 * Then: L('Jobs', 'עבודות') — returns Hebrew when lang=he, English otherwise
 */
export function useL() {
  const { lang } = useLanguage();
  return (en: string, he: string) => lang === 'he' ? he : en;
}

/**
 * Currency-aware formatter
 */
export function useCurrencyLabel() {
  const { lang } = useLanguage();
  return {
    isHe: lang === 'he',
    isEn: lang !== 'he',
    currencySymbol: lang === 'he' ? '₪' : '$',
  };
}
