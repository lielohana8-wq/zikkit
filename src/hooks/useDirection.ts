'use client';
import { useLanguage } from '@/hooks/useLanguage';

export function useDirection() {
  const { lang, dir, isRTL } = useLanguage();
  return { isRTL, dir, lang };
}
