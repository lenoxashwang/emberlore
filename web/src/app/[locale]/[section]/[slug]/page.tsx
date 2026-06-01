import { notFound } from 'next/navigation';
import { EntryMediaPreview } from '@/components/entry-media-preview';
import { getEntry, getSection, getTerminologyMap } from '@/lib/cms';
import { getLocaleMessages, resolveLocale } from '@/lib/i18n';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; section: string; slug: string }>;
}) {
  const { locale: rawLocale, section, slug } = await params;
  const locale = resolveLocale(rawLocale);
  const messages = getLocaleMessages(locale);
  const terminologyMap = await getTerminologyMap(locale);
  const [detail, sectionInfo] = await Promise.all([
    getEntry(locale, section, slug, terminologyMap),
    getSection(locale, section),
  ]);

  if (!detail) {
    notFound();
  }

  const { entry, tags, properties, blocks, awakenings } = detail;
  const showTextOnlyDetail = !entry.image_url && ['tags', 'runemaster'].includes(entry.section_slug);
  const visibleDescription = String(entry.description || '').trim();
  const showDescription = visibleDescription
    && visibleDescription.toLowerCase() !== String(entry.title || '').trim().toLowerCase();
  const visibleTags = entry.section_slug === 'uniques' ? [] : tags;
  const visibleProperties = properties.filter((item) => {
    const baseLabel = item.base_label || item.label;

    if (baseLabel === 'Min. rarity') {
      return !entry.rarity;
    }

    if (baseLabel === 'How to get') {
      return !entry.acquisition_method;
    }

    if (baseLabel === 'Weapon') {
      return !entry.weapon_requirement;
    }

    return true;
  });

  return (
    <article>
      <div className="eyebrow">{sectionInfo?.title || entry.section_slug}</div>
      <h1 className="detail-title">{entry.title}</h1>
      {showDescription ? <p className="muted">{entry.description}</p> : null}

      <section className={showTextOnlyDetail ? 'detail-grid detail-grid--text' : 'detail-grid'}>
        {showTextOnlyDetail ? null : (
          <div>
            <EntryMediaPreview
              closeLabel={messages.closePreview}
              emptyLabel={messages.noImage}
              imageUrl={entry.image_url}
              openLabel={messages.openPreview}
              title={entry.title}
              videoUrl={entry.video_url}
            />
          </div>
        )}

        <div className={showTextOnlyDetail ? 'detail-panel detail-panel--text' : 'detail-panel'}>
          <div className="property-list">
            {entry.rarity ? (
              <div>
                <strong>{messages.rarity}</strong>
                <div className="muted">{entry.rarity}</div>
              </div>
            ) : null}
            {entry.acquisition_method ? (
              <div>
                <strong>{messages.howToGet}</strong>
                <div className="muted">{entry.acquisition_method}</div>
              </div>
            ) : null}
            {entry.weapon_requirement ? (
              <div>
                <strong>{messages.weapon}</strong>
                <div className="muted">{entry.weapon_requirement}</div>
              </div>
            ) : null}
            {visibleProperties.map((item) => (
              <div key={item.source_key}>
                <strong>{item.label}</strong>
                <div className="muted">{item.value}</div>
              </div>
            ))}
          </div>

          {visibleTags.length > 0 ? (
            <div className="tag-row">
              {visibleTags.map((tag) => (
                <span className="tag-pill" key={tag.source_key}>
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {blocks.length > 0 ? (
        <section className="stats-grid">
          {blocks.map((block) => (
            <div className="tile-panel" key={block.source_key}>
              {block.title ? <h3>{block.title}</h3> : null}
              <ul className="line-list">
                {block.lines.map((line) => (
                  <li key={line.source_key}>{line.content}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {awakenings.length > 0 ? (
        <section className="awakening-grid">
          {awakenings.map((awakening) => (
            <div className="tile-panel" key={awakening.source_key}>
              <h4>{awakening.title}</h4>
              <ul className="line-list">
                {awakening.lines.map((line) => (
                  <li key={line.source_key}>{line.content}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </article>
  );
}
