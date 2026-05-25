/**
 * Til konteksti — butun ilova bo'ylab joriy tilni baham ko'radi.
 *
 * Til localStorage'da saqlanadi va Telegram'dagi user.language_code
 * yoki backend'dagi User.language bilan sinxronlashtirilishi mumkin.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { STRINGS, SUPPORTED_LANGS } from "./strings";
import type { Lang, StringKey } from "./strings";

const LANG_STORAGE_KEY = "zakovat:lang";
const DEFAULT_LANG: Lang = "uz-latn";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** "+{points} ball" kabi placeholderlarni almashtiradi. */
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang | null {
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (raw && (SUPPORTED_LANGS as string[]).includes(raw)) {
      return raw as Lang;
    }
  } catch {
    /* localStorage ishlamayotgan bo'lishi mumkin (private window va h.k.) */
  }
  return null;
}

function detectInitialLang(): Lang {
  const stored = readStoredLang();
  if (stored) return stored;
  // Telegram'dan user til kodi keladi ('ru', 'uz', 'en' va h.k.)
  try {
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (tgLang === "ru") return "ru";
    // Boshqa hammasi (uz, en, ...) — default uz-latn
  } catch {
    /* ignore */
  }
  return DEFAULT_LANG;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<LanguageContextValue["t"]>(
    (key, vars) => {
      const bundle = STRINGS[lang] ?? STRINGS[DEFAULT_LANG];
      const raw = bundle[key] ?? STRINGS[DEFAULT_LANG][key] ?? String(key);
      return interpolate(raw, vars);
    },
    [lang]
  );

  // <html lang="..."> ni ham yangilab qo'yamiz (a11y / screen reader uchun).
  useEffect(() => {
    try {
      document.documentElement.lang = lang === "ru" ? "ru" : "uz";
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}

/** Faqat tarjima funksiyasi kerak bo'lganda qisqaroq hook. */
export function useT(): LanguageContextValue["t"] {
  return useLanguage().t;
}
