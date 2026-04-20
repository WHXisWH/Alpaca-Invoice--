'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales, type Locale } from '@/i18n/config';

const localeLabels: Record<Locale, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
};

const localeFlags: Record<Locale, string> = {
  en: 'EN',
  zh: 'ZH',
  ja: 'JA',
};

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (locale: Locale) => {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }

    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    const barePath = pathname ? pathname.replace(/^\/(en|zh|ja)(?=\/|$)/, '') || '/' : '/';
    const targetPath = locale === 'en' ? barePath : `/${locale}${barePath}`;
    router.replace(targetPath);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-primary-500 transition-colors hover:bg-primary-100/70 hover:text-primary-700"
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium">{localeFlags[currentLocale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => switchLocale(locale)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-primary-50 ${
                locale === currentLocale ? 'font-semibold text-primary-700' : 'text-slate-600'
              }`}
            >
              <span className="w-6 text-center text-xs font-bold text-slate-400">{localeFlags[locale]}</span>
              {localeLabels[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
