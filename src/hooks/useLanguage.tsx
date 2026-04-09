'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { he } from '@/i18n/he';

type Lang = 'en' | 'es' | 'he';
type TranslationKey = keyof typeof en;

const translations: Record<Lang, Record<string, string>> = { en, es, he };

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en', setLang: () => {}, t: (k) => k, dir: 'ltr', isRTL: false,
});

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  // 1. Check localStorage for saved cfg
  try {
    const cfg = JSON.parse(localStorage.getItem('fp_config') || '{}');
    if (cfg.lang && ['en', 'es', 'he'].includes(cfg.lang)) return cfg.lang;
  } catch {}
  // 2. Check browser language
  const nav = navigator.language || '';
  if (nav.includes('he') || nav.includes('iw')) return 'he';
  if (nav.includes('es')) return 'es';
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l;
      document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
    }
  }, []);

  // Apply direction on mount
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  }, [lang]);

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const isRTL = lang === 'he';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
