'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  replaceLocaleInPathname,
  resolveLocale,
  SUPPORTED_LOCALES,
} from '@/lib/i18n';

const SWITCHER_LABELS = {
  en: 'EN',
  'zh-CN': '简中',
  'zh-TW': '繁中',
} as const;

export default function LocaleSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = resolveLocale(locale);
  const query = searchParams.toString();

  return (
    <div className="locale-switcher">
      <div className="locale-switcher-list">
        {SUPPORTED_LOCALES.map((item) => {
          const nextPath = replaceLocaleInPathname(pathname || '/', item);
          const href = query ? `${nextPath}?${query}` : nextPath;

          return (
            <Link
              className={`locale-switcher-link ${item === activeLocale ? 'is-active' : ''}`}
              href={href}
              key={item}
            >
              {SWITCHER_LABELS[item]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
