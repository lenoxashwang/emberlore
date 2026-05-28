import { notFound } from 'next/navigation';
import SectionSearch from '@/components/section-search';
import { getEntries, getSection } from '@/lib/cms';

export default async function SectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  const [sectionRecord, entries] = await Promise.all([
    getSection(locale, section),
    getEntries(locale, section),
  ]);

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
        <div className="empty-state">这个栏目里还没有内容，请先在 Directus 中新增数据。</div>
      ) : (
        <SectionSearch
          entries={entries}
          locale={locale}
          section={section}
          sectionTitle={sectionRecord.title}
        />
      )}
    </div>
  );
}
