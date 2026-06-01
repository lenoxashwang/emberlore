import { notFound } from 'next/navigation';
import SectionSearch from '@/components/section-search';
import { getEntries, getSection, getTerminologyMap } from '@/lib/cms';
import { getLocaleMessages, resolveLocale } from '@/lib/i18n';

export default async function SectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale: rawLocale, section } = await params;
  const locale = resolveLocale(rawLocale);
  const messages = getLocaleMessages(locale);
  const [sectionRecord, terminologyMap] = await Promise.all([
    getSection(locale, section),
    getTerminologyMap(locale),
  ]);
  const entries = await getEntries(locale, section, terminologyMap);

  if (!sectionRecord) {
    notFound();
  }

  return (
    <div>
      <header>
        <div className="eyebrow">{sectionRecord.slug}</div>
        <h1>{sectionRecord.title}</h1>
        <p className="muted">{sectionRecord.description}</p>
      </header>

      {entries.length === 0 ? (
        <div className="empty-state">{messages.sectionEmptyState}</div>
      ) : (
        <SectionSearch
          entries={entries}
          locale={locale}
          section={section}
          sectionTitle={sectionRecord.title}
          terminologyMap={terminologyMap}
        />
      )}
    </div>
  );
}
