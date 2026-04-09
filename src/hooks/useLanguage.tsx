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
  lang: 'he', setLang: () => {}, t: (k) => k, dir: 'rtl', isRTL: true,
});

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'he';
  // 1. Check business config for explicit lang
  try {
    const cfg = JSON.parse(localStorage.getItem('fp_config') || '{}');
    if (cfg.lang && ['en', 'es', 'he'].includes(cfg.lang)) return cfg.lang;
    // 2. Check region — Israel = Hebrew
    if (cfg.region === 'IL') return 'he';
  } catch {}
  // 3. Check browser language
  const nav = navigator.language || '';
  if (nav.includes('he') || nav.includes('iw')) return 'he';
  if (nav.includes('es')) return 'es';
  // 4. Default to Hebrew (most users are Israeli for now)
  return 'he';
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

  // One-time migration: force Hebrew for existing users
  useEffect(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('fp_config') || '{}');
      if (!cfg._langMigrated) {
        cfg.lang = 'he';
        cfg._langMigrated = true;
        localStorage.setItem('fp_config', JSON.stringify(cfg));
        setLangState('he');
      }
    } catch {}
  }, []);

  // Sync language from business config when it changes
  useEffect(() => {
    const check = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('fp_config') || '{}');
        if (cfg.lang && ['en', 'es', 'he'].includes(cfg.lang) && cfg.lang !== lang) {
          setLangState(cfg.lang);
        } else if (cfg.region === 'IL' && lang !== 'he') {
          setLangState('he');
        }
      } catch {}
    };
    check();
    // Re-check when storage changes (from DataProvider sync)
    window.addEventListener('storage', check);
    const timer = setInterval(check, 3000);
    return () => { window.removeEventListener('storage', check); clearInterval(timer); };
  }, [lang]);

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
