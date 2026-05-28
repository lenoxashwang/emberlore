import { notFound } from 'next/navigation';
import { getEntry } from '@/lib/cms';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; section: string; slug: string }>;
}) {
  const { locale, section, slug } = await params;
  const detail = await getEntry(locale, section, slug);

  if (!detail) {
    notFound();
  }

  const { entry, tags, properties, blocks, awakenings } = detail;

  return (
    <article>
      <div className="eyebrow">{entry.section_slug}</div>
      <h1 className="detail-title">{entry.title}</h1>
      <p className="muted">{entry.description}</p>

      <section className="detail-grid">
        <div>
          {entry.image_url ? (
            <img alt={entry.title} className="hero-image" src={entry.image_url} />
          ) : (
            <div className="empty-state">No image</div>
          )}
        </div>

        <div className="detail-panel">
          <div className="property-list">
            {entry.rarity ? (
              <div>
                <strong>Rarity</strong>
                <div className="muted">{entry.rarity}</div>
              </div>
            ) : null}
            {entry.acquisition_method ? (
              <div>
                <strong>How to get</strong>
                <div className="muted">{entry.acquisition_method}</div>
              </div>
            ) : null}
            {entry.weapon_requirement ? (
              <div>
                <strong>Weapon</strong>
                <div className="muted">{entry.weapon_requirement}</div>
              </div>
            ) : null}
            {properties.map((item) => (
              <div key={item.source_key}>
                <strong>{item.label}</strong>
                <div className="muted">{item.value}</div>
              </div>
            ))}
          </div>

          {tags.length > 0 ? (
            <div className="tag-row">
              {tags.map((tag) => (
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
              <h3>{block.title}</h3>
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

