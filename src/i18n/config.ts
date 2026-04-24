export const locales = ["fr", "en", "es", "de", "ja", "pt", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
