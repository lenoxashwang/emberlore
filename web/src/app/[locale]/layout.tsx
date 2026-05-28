import Link from 'next/link';
import { getNavigation, getSiteSettings } from '@/lib/cms';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [settings, navigation] = await Promise.all([
    getSiteSettings(),
    getNavigation(locale),
  ]);

  const grouped = navigation.reduce<Record<string, typeof navigation>>((acc, item) => {
    const key = item.group_name || 'main';
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1 className="logo">{settings.logo_text || settings.site_name || 'Undecember'}</h1>
        {Object.entries(grouped).map(([group, items]) => (
          <div className="nav-group" key={group}>
            {items.map((item) => (
              <Link
                className="nav-link"
                href={item.href}
                key={item.source_key}
                target={item.open_in_new_tab ? '_blank' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

