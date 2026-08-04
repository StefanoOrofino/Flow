import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, {
  AVAILABLE_LANGUAGES,
  LanguageCode,
  detectDeviceLanguage,
  isValidLanguage,
} from "./i18n";

const STORAGE_KEY = "frameflow.language";

type LanguageContextValue = {
  currentLanguage: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  availableLanguages: typeof AVAILABLE_LANGUAGES;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      let lang: LanguageCode;
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        lang = isValidLanguage(saved) ? saved : detectDeviceLanguage();
      } catch {
        lang = detectDeviceLanguage();
      }
      await i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      setReady(true);
    })();
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    if (!isValidLanguage(code)) return;
    setCurrentLanguage(code);
    i18n.changeLanguage(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    currentLanguage,
    setLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
  }), [currentLanguage, setLanguage]);

  // Gate first render until the resolved language is applied (prevents flicker).
  if (!ready) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
