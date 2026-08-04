import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./en.json";
import it from "./it.json";

export const AVAILABLE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
] as const;

export type LanguageCode = "en" | "it";

export const isValidLanguage = (v: unknown): v is LanguageCode =>
  v === "en" || v === "it";

/** First-launch device detection: Italian only for "it", English otherwise. */
export function detectDeviceLanguage(): LanguageCode {
  try {
    const code = getLocales()?.[0]?.languageCode?.toLowerCase();
    return code === "it" ? "it" : "en";
  } catch {
    return "en";
  }
}

const NS = Object.keys(en);

const resources = {
  en,
  it,
} as const;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // provisional; LanguageProvider sets the resolved language on mount
    fallbackLng: "en",
    ns: NS,
    defaultNS: "common",
    fallbackNS: "common",
    interpolation: { escapeValue: false },
    returnNull: false,
    saveMissing: __DEV__,
    missingKeyHandler: (_lng, ns, key) => {
      if (__DEV__) console.warn(`[i18n] Missing key: ${ns}:${key}`);
    },
    react: { useSuspense: false },
  });

export default i18n;
