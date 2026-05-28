import Link from 'next/link';
import { HomeSlider } from '@/components/home-slider';
import { getHomePageData } from '@/lib/cms';

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href || '');
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const data = await getHomePageData(locale);
  const wideCards = data.cards.filter((card) => card.card_size === 'wide');
  const tileCards = data.cards.filter((card) => card.card_size !== 'wide');

  return (
    <div className="home-grid">
      <section className="download-grid">
        {data.downloads.map((item) => (
          <a
            className="download-card"
            data-platform={item.platform}
            href={item.href}
            key={item.source_key}
            rel="noreferrer"
            target="_blank"
          >
            <span className="download-card-mark">{item.platform.replace(/_/g, ' ')}</span>
            <span className="download-card-copy">
              <strong>{item.label}</strong>
              <span className="muted">{item.platform.replace(/_/g, ' ')}</span>
            </span>
          </a>
        ))}
      </section>

      <HomeSlider slides={data.slides} />

      {wideCards.map((card) =>
        isExternalHref(card.href) ? (
          <a
            className="feature-card"
            data-size={card.card_size}
            href={card.href}
            key={card.source_key}
            rel="noreferrer"
            target="_blank"
          >
            <span className="home-feature-bg" style={{ background: card.background_css || undefined }} />
            {card.image_url ? (
              <img alt={card.title} className="home-feature-image" src={card.image_url} />
            ) : null}
            <span className="home-feature-shade" />
            <div className="feature-card-content">
              <div className="eyebrow">{card.card_size}</div>
              <h3>{card.title}</h3>
              <p className="muted">{card.subtitle}</p>
            </div>
          </a>
        ) : (
          <Link className="feature-card" data-size={card.card_size} href={card.href} key={card.source_key}>
            <span className="home-feature-bg" style={{ background: card.background_css || undefined }} />
            {card.image_url ? (
              <img alt={card.title} className="home-feature-image" src={card.image_url} />
            ) : null}
            <span className="home-feature-shade" />
            <div className="feature-card-content">
              <div className="eyebrow">{card.card_size}</div>
              <h3>{card.title}</h3>
              <p className="muted">{card.subtitle}</p>
            </div>
          </Link>
        ),
      )}

      {tileCards.length > 0 ? (
        <section className="card-grid home-card-grid">
          {tileCards.map((card) =>
            isExternalHref(card.href) ? (
              <a
                className="feature-card"
                data-size={card.card_size}
                href={card.href}
                key={card.source_key}
                rel="noreferrer"
                target="_blank"
              >
                <span className="home-feature-bg" style={{ background: card.background_css || undefined }} />
                {card.image_url ? (
                  <img alt={card.title} className="home-feature-image" src={card.image_url} />
                ) : null}
                <span className="home-feature-shade" />
                <div className="feature-card-content">
                  <div className="eyebrow">{card.card_size}</div>
                  <h3>{card.title}</h3>
                  <p className="muted">{card.subtitle}</p>
                </div>
              </a>
            ) : (
              <Link className="feature-card" data-size={card.card_size} href={card.href} key={card.source_key}>
                <span className="home-feature-bg" style={{ background: card.background_css || undefined }} />
                {card.image_url ? (
                  <img alt={card.title} className="home-feature-image" src={card.image_url} />
                ) : null}
                <span className="home-feature-shade" />
                <div className="feature-card-content">
                  <div className="eyebrow">{card.card_size}</div>
                  <h3>{card.title}</h3>
                  <p className="muted">{card.subtitle}</p>
                </div>
              </Link>
            ),
          )}
        </section>
      ) : null}

      {data.cards.length === 0 ? (
        <section>
          <h2>Sections</h2>
          {data.sections.length === 0 ? (
            <div className="empty-state">Directus 里还没有栏目数据。</div>
          ) : (
            <div className="section-grid">
              {data.sections.map((section) => (
                <Link className="section-card" href={`/${locale}/${section.slug}`} key={section.source_key}>
                  <h3 className="section-card-title">{section.title}</h3>
                  <p className="muted">{section.description}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
