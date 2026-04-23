import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from "./config";

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranges = header.split(",").map((r) => r.split(";")[0].trim().toLowerCase());
  for (const r of ranges) {
    const base = r.split("-")[0] as Locale;
    if ((locales as readonly string[]).includes(base)) return base;
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  let locale: Locale = defaultLocale;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    const accept = headerStore.get("accept-language");
    const parsed = parseAcceptLanguage(accept);
    if (parsed) locale = parsed;
  }
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
