import { defaultLocale, locales, type Locale } from '@/i18n/config';

export function extractLocaleFromPathname(pathname: string | null | undefined): Locale {
  const segment = pathname?.split('/')[1];
  if (segment && locales.includes(segment as Locale)) {
    return segment as Locale;
  }
  return defaultLocale;
}

export function toLocalizedHref(pathname: string | null | undefined, target: string): string {
  const locale = extractLocaleFromPathname(pathname);
  return locale === defaultLocale ? target : `/${locale}${target}`;
}
